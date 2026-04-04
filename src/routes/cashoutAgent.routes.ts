import { Router } from 'express';
import { CashoutAgentController } from '../controllers/cashoutAgent.controller';
import { CashoutAgentService } from '../services/cashoutAgent.service';
import { Database } from 'sqlite3';

// Global variable to track if database has been set
let globalDbSetCalled = false;

export function createCashoutAgentRoutes(db: Database | null): Router {
  console.log('🔴 Creating cashout agent routes');
  console.log('🔴 Initial db provided:', !!db);
  
  const router = Router();
  
  // Store database reference
  let databaseRef: Database | null = db;
  let cashoutAgentController: CashoutAgentController | null = null;
  
  // Initialize if database available at creation
  if (databaseRef) {
    console.log('🔴 Database available at creation, initializing...');
    try {
      const cashoutAgentService = new CashoutAgentService();
      cashoutAgentController = new CashoutAgentController(cashoutAgentService);
      console.log('✅ CashoutAgentController initialized at creation');
    } catch (error) {
      console.error('❌ Failed to initialize at creation:', error);
    }
  } else {
    console.log('🔴 No database at creation, waiting for setDatabase call');
  }
  
  // EXPOSE setDatabase to GLOBAL scope for debugging
  const setDatabase = (newDb: Database) => {
    console.log('🔴 setDatabase called');
    console.log('🔴 NewDb provided:', !!newDb);
    
    if (!newDb) {
      console.error('❌ setDatabase called with null/undefined database');
      return;
    }
    
    databaseRef = newDb;
    globalDbSetCalled = true;
    
    // Initialize controller immediately
    if (!cashoutAgentController) {
      console.log('🔴 Initializing controller in setDatabase...');
      try {
        const cashoutAgentService = new CashoutAgentService();
        cashoutAgentController = new CashoutAgentController(cashoutAgentService);
        console.log('✅ CashoutAgentController initialized successfully');
      } catch (error) {
        console.error('❌ Failed to initialize controller:', error);
      }
    }
    
    console.log('✅ Database set and controller ready');
  };
  
  // Store setDatabase on router
  (router as any).setDatabase = setDatabase;
  
  // Add debug method to check status
  (router as any).getStatus = () => {
    return {
      databaseRefExists: !!databaseRef,
      controllerExists: !!cashoutAgentController,
      globalDbSetCalled: globalDbSetCalled,
      timestamp: new Date().toISOString()
    };
  };
  
  const getController = () => {
    console.log('🔵 getController called - databaseRef:', !!databaseRef, 'controller:', !!cashoutAgentController);
    
    if (!cashoutAgentController && databaseRef) {
      console.log('🔵 Emergency initialization in getController...');
      try {
        const cashoutAgentService = new CashoutAgentService();
        cashoutAgentController = new CashoutAgentController(cashoutAgentService);
        console.log('✅ Emergency initialization successful');
      } catch (error) {
        console.error('❌ Emergency initialization failed:', error);
      }
    }
    
    return cashoutAgentController;
  };
  
  // Debug endpoints
  router.get('/debug/status', (req, res) => {
    const status = (router as any).getStatus();
    res.json({
      status: status,
      message: status.controllerExists ? 'Controller is ready' : 'Controller not ready'
    });
  });
  
  router.get('/debug/force-init', (req, res) => {
    const controller = getController();
    res.json({
      controllerExists: !!controller,
      databaseRefExists: !!databaseRef,
      message: controller ? 'Controller initialized' : 'Controller still not available'
    });
  });
  
  // Main endpoint
  router.post('/request', async (req, res) => {
    console.log('🔴 POST /request hit');
    
    const controllerInstance = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
    console.log('🔴 Controller available:', !!controllerInstance);
    
    try {
      await controllerInstance.processCashoutRequest(req, res);
    } catch (error) {
      console.error('❌ Error in route handler:', error);
      res.status(500).json({
        status: 'error',
        message: 'Internal server error'
      });
    }
  });
  
  // Other routes (keep as is)
  router.get('/requests', (req, res) => {
    const controllerInstance = new CashoutAgentController(new (require('../services/cashout-agent.service')).CashoutAgentService());
    controllerInstance.getCashoutRequests(req, res);
  });
  
  router.put('/:id/status', (req, res) => {
    const controller = getController();
    if (!controller) {
      return res.status(503).json({
        status: 'error',
        message: 'Database not available'
      });
    }
    controller.updateCashoutStatus(req, res);
  });
  
  console.log('🔴 Routes created and ready');
  console.log('🔴 Initial status:', (router as any).getStatus());
  
  return router;
}