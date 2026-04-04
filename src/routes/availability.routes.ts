import { Router } from 'express';
import { RegisterService } from '../services/register.service';
import { testAvailabilityDirectly } from '../controllers/test.controller';

const router = Router();
const registerService = new RegisterService();

// Handle preflight requests
router.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.sendStatus(200);
});

// GET /api/availability/username/:username - Check username availability
router.get('/username/:username', async (req, res) => {
  try {
    const { username } = req.params;
    
    console.log('🔍 Availability API - Username check request:', { username });

    if (!username) {
      console.log('❌ Availability API - Username missing');
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Basic validation
    if (username.length < 3) {
      return res.json({
        success: true,
        data: {
          username: username,
          available: false,
          reason: 'too_short'
        },
        message: 'Username must be at least 3 characters'
      });
    }

    if (!username.match(/^[a-zA-Z0-9_]{3,30}$/)) {
      return res.json({
        success: true,
        data: {
          username: username,
          available: false,
          reason: 'invalid_format'
        },
        message: 'Username must contain only letters, numbers, and underscores'
      });
    }

    const isAvailable = await registerService.checkUsernameAvailability(username.trim());

    console.log('🔍 Availability API - Username check result:', { 
      username: username.trim(), 
      available: isAvailable 
    });

    res.json({
      success: true,
      data: {
        username: username.trim(),
        available: isAvailable,
        reason: isAvailable ? 'available' : 'taken'
      },
      message: `Username ${isAvailable ? 'is available' : 'is already taken'}`
    });

  } catch (error: any) {
    console.error('❌ Availability API - Username check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check username availability'
    });
  }
});

// GET /api/availability/phone/:phone_number - Check phone number availability
router.get('/phone/:phone_number', async (req, res) => {
  try {
    const { phone_number } = req.params;
    
    console.log('🔍 Availability API - Phone check request:', { phone_number });

    if (!phone_number) {
      console.log('❌ Availability API - Phone number missing');
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Basic validation
    const phoneRegex = /^\+2519\d{8}$|^09\d{8}$/;
    if (!phoneRegex.test(phone_number)) {
      return res.json({
        success: true,
        data: {
          phone_number: phone_number,
          available: false,
          reason: 'invalid_format'
        },
        message: 'Invalid phone number format. Use +2519xxxxxxxx or 09xxxxxxxx'
      });
    }

    // Convert 09 format to +251 format for checking
    let formattedPhone = phone_number.trim();
    if (phone_number.startsWith('09')) {
      formattedPhone = '+251' + phone_number.substring(1);
    }

    console.log('🔍 Availability API - Checking formatted phone:', formattedPhone);

    const isAvailable = await registerService.checkPhoneAvailability(formattedPhone);

    console.log('🔍 Availability API - Phone check result:', { 
      originalPhone: phone_number.trim(),
      formattedPhone, 
      available: isAvailable 
    });

    res.json({
      success: true,
      data: {
        phone_number: formattedPhone,
        available: isAvailable,
        reason: isAvailable ? 'available' : 'taken'
      },
      message: `Phone number ${isAvailable ? 'is available' : 'is already registered'}`
    });

  } catch (error: any) {
    console.error('❌ Availability API - Phone check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check phone number availability'
    });
  }
});

// GET /api/availability/check-username-phone - Combined username and phone check
router.get('/check-username-phone', async (req, res) => {
  try {
    const { username, phone_number } = req.query;
    
    console.log('🔍 Availability API - Combined check request:', { username, phone_number });

    const result: any = {
      success: true,
      data: {}
    };

    // Check username if provided
    if (username && typeof username === 'string') {
      if (username.length < 3) {
        result.data.username = {
          available: false,
          reason: 'too_short',
          message: 'Username must be at least 3 characters'
        };
      } else if (!username.match(/^[a-zA-Z0-9_]{3,30}$/)) {
        result.data.username = {
          available: false,
          reason: 'invalid_format',
          message: 'Username must contain only letters, numbers, and underscores'
        };
      } else {
        const isAvailable = await registerService.checkUsernameAvailability(username.trim());
        result.data.username = {
          available: isAvailable,
          reason: isAvailable ? 'available' : 'taken',
          message: `Username ${isAvailable ? 'is available' : 'is already taken'}`
        };
      }
    }

    // Check phone number if provided
    if (phone_number && typeof phone_number === 'string') {
      const phoneRegex = /^\+2519\d{8}$|^09\d{8}$/;
      if (!phoneRegex.test(phone_number)) {
        result.data.phone_number = {
          available: false,
          reason: 'invalid_format',
          message: 'Invalid phone number format. Use +2519xxxxxxxx or 09xxxxxxxx'
        };
      } else {
        // Convert 09 format to +251 format for checking
        let formattedPhone = phone_number.trim();
        if (phone_number.startsWith('09')) {
          formattedPhone = '+251' + phone_number.substring(1);
        }

        const isAvailable = await registerService.checkPhoneAvailability(formattedPhone);
        result.data.phone_number = {
          available: isAvailable,
          reason: isAvailable ? 'available' : 'taken',
          message: `Phone number ${isAvailable ? 'is available' : 'is already registered'}`
        };
      }
    }

    console.log('🔍 Availability API - Combined check result:', result.data);
    res.json(result);

  } catch (error: any) {
    console.error('❌ Availability API - Combined check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check availability'
    });
  }
});

// GET /api/availability/test?username=kaleab1 - Direct database test
router.get('/test', testAvailabilityDirectly);

export default router;
