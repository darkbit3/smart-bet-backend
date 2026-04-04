import { Request, Response } from 'express';
import { ResponseHelper } from '../../utils/response';

interface PlayerBalanceClient {
  id: string;
  phoneNumber: string;
  res: Response;
  lastPing: number;
}

class BalanceController {
  // Store active SSE connections for each player
  private static playerConnections: Map<string, PlayerBalanceClient[]> = new Map();
  
  // Clean up inactive connections every 30 seconds
  private static cleanupInterval = setInterval(() => {
    BalanceController.cleanupInactiveConnections();
  }, 30000);

  // Subscribe to balance updates for a specific player
  static subscribeToBalanceUpdates = (req: Request, res: Response) => {
    const { phoneNumber } = req.query;
    
    if (!phoneNumber || typeof phoneNumber !== 'string') {
      return ResponseHelper.fail(res, 'Phone number is required', 400);
    }

    console.log(`🔔 Player ${phoneNumber} subscribed to balance updates`);

    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Generate unique client ID
    const clientId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    
    // Store the connection
    const client: PlayerBalanceClient = {
      id: clientId,
      phoneNumber: phoneNumber,
      res: res,
      lastPing: Date.now()
    };

    if (!BalanceController.playerConnections.has(phoneNumber)) {
      BalanceController.playerConnections.set(phoneNumber, []);
    }
    
    BalanceController.playerConnections.get(phoneNumber)!.push(client);

    // Send initial connection message
    res.write(`data: ${JSON.stringify({
      type: 'connected',
      clientId: clientId,
      phoneNumber: phoneNumber,
      timestamp: Date.now()
    })}\n\n`);

    // Handle client disconnect
    res.on('close', () => {
      console.log(`🔌 Player ${phoneNumber} disconnected from balance updates`);
      BalanceController.removeClient(phoneNumber, clientId);
    });

    // Send periodic ping to keep connection alive
    const pingInterval = setInterval(() => {
      if (res.writable) {
        res.write(`data: ${JSON.stringify({
          type: 'ping',
          timestamp: Date.now()
        })}\n\n`);
        client.lastPing = Date.now();
      } else {
        clearInterval(pingInterval);
        BalanceController.removeClient(phoneNumber, clientId);
      }
    }, 30000); // Ping every 30 seconds

    // Clean up ping interval on disconnect
    res.on('close', () => {
      clearInterval(pingInterval);
    });
  };

  // Notify players of balance updates (called by deposit/withdraw controllers)
  static notifyBalanceUpdate = (phoneNumber: string, balanceData: any) => {
    console.log(`📢 Notifying balance update for ${phoneNumber}:`, balanceData);
    
    const clients = BalanceController.playerConnections.get(phoneNumber);
    if (!clients || clients.length === 0) {
      console.log(`📭 No active connections for ${phoneNumber}`);
      return;
    }

    const message = JSON.stringify({
      type: 'balance_update',
      phoneNumber: phoneNumber,
      data: balanceData,
      timestamp: Date.now()
    });

    // Send update to all connected clients for this player
    clients.forEach(client => {
      try {
        if (client.res.writable) {
          client.res.write(`data: ${message}\n\n`);
          console.log(`✅ Sent balance update to client ${client.id}`);
        }
      } catch (error) {
        console.error(`❌ Failed to send update to client ${client.id}:`, error);
        // Remove problematic client
        BalanceController.removeClient(phoneNumber, client.id);
      }
    });
  };

  // Remove a specific client
  private static removeClient = (phoneNumber: string, clientId: string) => {
    const clients = BalanceController.playerConnections.get(phoneNumber);
    if (clients) {
      const index = clients.findIndex(client => client.id === clientId);
      if (index > -1) {
        clients.splice(index, 1);
        console.log(`🗑️ Removed client ${clientId} for ${phoneNumber}`);
      }
      
      // Clean up empty phone number entries
      if (clients.length === 0) {
        BalanceController.playerConnections.delete(phoneNumber);
      }
    }
  };

  // Clean up inactive connections
  private static cleanupInactiveConnections = () => {
    const now = Date.now();
    const timeout = 60000; // 1 minute timeout
    
    console.log(`🧹 Cleaning up inactive SSE connections...`);
    
    for (const [phoneNumber, clients] of BalanceController.playerConnections.entries()) {
      const activeClients: PlayerBalanceClient[] = [];
      
      clients.forEach(client => {
        if (now - client.lastPing < timeout) {
          activeClients.push(client);
        } else {
          try {
            client.res.end();
          } catch (error) {
            // Connection already closed
          }
          console.log(`⏰ Removed inactive client ${client.id} for ${phoneNumber}`);
        }
      });
      
      if (activeClients.length > 0) {
        BalanceController.playerConnections.set(phoneNumber, activeClients);
      } else {
        BalanceController.playerConnections.delete(phoneNumber);
      }
    }
    
    console.log(`🧹 Cleanup complete. Active connections: ${BalanceController.playerConnections.size} players`);
  };

  // Get connection stats (for debugging)
  static getConnectionStats = () => {
    const stats: any = {};
    for (const [phoneNumber, clients] of BalanceController.playerConnections.entries()) {
      stats[phoneNumber] = clients.length;
    }
    return {
      totalPlayers: BalanceController.playerConnections.size,
      totalConnections: Array.from(BalanceController.playerConnections.values()).reduce((sum, clients) => sum + clients.length, 0),
      connectionsByPlayer: stats
    };
  };
}

export { BalanceController };
