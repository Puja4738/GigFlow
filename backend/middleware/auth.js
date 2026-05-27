// middleware/auth.js - Complete Authentication Middleware
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * 🔐 Authentication Middleware
 * Protects routes by verifying JWT token from cookies or Authorization header
 * 
 * Usage: Add to any route that requires authentication
 * Example: router.get('/protected', protect, controllerFunction)
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    /**
     * 1️⃣ PRIMARY: Read token from HttpOnly cookies (MAIN AUTH METHOD)
     * This is REQUIRED for Netlify → Render cross-origin authentication
     */
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('✅ Token found in cookies');
    }

    /**
     * 2️⃣ FALLBACK: Read token from Authorization header
     * Allows Bearer token if cookies are not present (for mobile apps, Postman, etc.)
     */
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('✅ Token found in Authorization header');
    }

    /**
     * 3️⃣ No token found → unauthorized
     */
    if (!token) {
      console.log('❌ No token found in cookies or headers');
      console.log('Cookies:', req.cookies);
      console.log('Authorization header:', req.headers.authorization);
      
      return res.status(401).json({
        message: 'Not authorized, please login',
        success: false
      });
    }

    /**
     * 4️⃣ Verify JWT token
     */
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log('✅ Token verified successfully for user ID:', decoded.id);
    } catch (err) {
      console.error('❌ JWT verification failed:', err.message);
      
      // Clear invalid cookie if it exists
      if (req.cookies && req.cookies.token) {
        const isProduction = process.env.NODE_ENV === 'production';
        res.clearCookie('token', {
          httpOnly: true,
          secure: isProduction,
          sameSite: isProduction ? 'None' : 'Lax',
          path: '/'
        });
      }
      
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          message: 'Token expired, please login again',
          success: false
        });
      }
      
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
          message: 'Invalid token, please login again',
          success: false
        });
      }
      
      return res.status(401).json({
        message: 'Not authorized, token verification failed',
        success: false
      });
    }

    /**
     * 5️⃣ Validate decoded payload
     */
    if (!decoded || !decoded.id) {
      console.error('❌ Invalid token payload - missing user ID');
      return res.status(401).json({
        message: 'Not authorized, invalid token payload',
        success: false
      });
    }

    /**
     * 6️⃣ Fetch user from database (exclude password)
     */
    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      console.error('❌ User not found for ID:', decoded.id);
      return res.status(401).json({
        message: 'User not found - account may have been deleted',
        success: false
      });
    }

    /**
     * 7️⃣ Attach user to request object
     * This makes user data available to all subsequent middleware and route handlers
     */
    req.user = user;
    console.log('✅ User authenticated:', user.email, '(ID:', user._id.toString() + ')');

    /**
     * 8️⃣ SUCCESS — proceed to next middleware/route handler
     */
    next();

  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(401).json({
      message: 'Not authorized, authentication failed',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 🔐 Check if user is gig owner
 * Use this middleware AFTER protect middleware
 * 
 * Usage: router.delete('/gigs/:gigId', protect, isGigOwner, deleteGig)
 */
exports.isGigOwner = async (req, res, next) => {
  try {
    const Gig = require('../models/Gig');
    
    // Get gig ID from params (supports both :gigId and :id)
    const gigId = req.params.gigId || req.params.id;
    
    if (!gigId) {
      console.error('❌ No gig ID provided in params');
      return res.status(400).json({
        message: 'Gig ID is required',
        success: false
      });
    }

    // Find gig
    const gig = await Gig.findById(gigId);

    if (!gig) {
      console.error('❌ Gig not found:', gigId);
      return res.status(404).json({
        message: 'Gig not found',
        success: false
      });
    }

    // Check if current user is the gig owner
    if (gig.ownerId.toString() !== req.user._id.toString()) {
      console.error('❌ Authorization failed: User', req.user._id, 'is not owner of gig', gigId);
      return res.status(403).json({
        message: 'Not authorized to access this resource - you are not the owner',
        success: false
      });
    }

    console.log('✅ User authorized as gig owner');

    // Attach gig to request for convenience (optional)
    req.gig = gig;
    next();

  } catch (error) {
    console.error('❌ isGigOwner middleware error:', error);
    return res.status(500).json({
      message: 'Server error while checking authorization',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 🔐 Check if user is bid owner
 * Use this middleware AFTER protect middleware
 * 
 * Usage: router.delete('/bids/:bidId', protect, isBidOwner, deleteBid)
 */
exports.isBidOwner = async (req, res, next) => {
  try {
    const Bid = require('../models/Bid');
    
    // Get bid ID from params
    const bidId = req.params.bidId || req.params.id;
    
    if (!bidId) {
      console.error('❌ No bid ID provided in params');
      return res.status(400).json({
        message: 'Bid ID is required',
        success: false
      });
    }

    // Find bid
    const bid = await Bid.findById(bidId);

    if (!bid) {
      console.error('❌ Bid not found:', bidId);
      return res.status(404).json({
        message: 'Bid not found',
        success: false
      });
    }

    // Check if current user is the bid owner (freelancer)
    if (bid.freelancerId.toString() !== req.user._id.toString()) {
      console.error('❌ Authorization failed: User', req.user._id, 'is not owner of bid', bidId);
      return res.status(403).json({
        message: 'Not authorized to access this resource - you are not the bid owner',
        success: false
      });
    }

    console.log('✅ User authorized as bid owner');

    // Attach bid to request for convenience
    req.bid = bid;
    next();

  } catch (error) {
    console.error('❌ isBidOwner middleware error:', error);
    return res.status(500).json({
      message: 'Server error while checking authorization',
      success: false,
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * 🔐 Optional Authentication Middleware
 * Attaches user to request if token is valid, but doesn't block if not authenticated
 * Useful for routes that work differently for logged-in vs anonymous users
 * 
 * Usage: router.get('/gigs', optionalAuth, getAllGigs)
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    // Try to get token from cookies
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // Try to get token from Authorization header
    else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    // If no token, just continue without attaching user
    if (!token) {
      console.log('ℹ️ No token found - continuing as anonymous user');
      return next();
    }

    // Try to verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (user) {
        req.user = user;
        console.log('✅ Optional auth: User authenticated:', user.email);
      }
    } catch (err) {
      console.log('ℹ️ Optional auth: Invalid token, continuing as anonymous');
    }

    next();

  } catch (error) {
    console.error('❌ Optional auth error:', error);
    // Don't block request on error, just continue
    next();
  }
};