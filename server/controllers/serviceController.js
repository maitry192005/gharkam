const Service = require('../models/Service');
const HelperProfile = require('../models/HelperProfile');

// @desc    Get all active services
// @route   GET /api/services
// @access  Public
const getAllServices = async (req, res, next) => {
  try {
    const { search, category } = req.query;
    let query = { active: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    const services = await Service.find(query).sort({ name: 1 });

    res.status(200).json({
      success: true,
      count: services.length,
      data: services,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get service by slug with available approved helpers
// @route   GET /api/services/:slug
// @access  Public
const getServiceBySlug = async (req, res, next) => {
  try {
    const service = await Service.findOne({ slug: req.params.slug.toLowerCase(), active: true });
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'Service not found.',
      });
    }

    // Find up to 6 approved helpers offering this service
    const helperProfiles = await HelperProfile.find({
      status: 'approved',
      isAvailable: true,
      'services.service': service._id,
    })
      .populate('user', 'fullName avatar address ratingAvg ratingCount')
      .limit(6);

    res.status(200).json({
      success: true,
      data: {
        service,
        helpers: helperProfiles,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Create new service (Admin)
// @route   POST /api/services
// @access  Private/Admin
const createService = async (req, res, next) => {
  try {
    const { name, category, icon, image, description, whatIsIncluded, baseRate } = req.body;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const existing = await Service.findOne({ slug });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A service with this name already exists.' });
    }

    const service = await Service.create({
      name,
      slug,
      category: category || 'Domestic Help',
      icon: icon || 'bi-house-heart',
      image: image || 'service-cleaning.jpg',
      description,
      whatIsIncluded: Array.isArray(whatIsIncluded) ? whatIsIncluded : [whatIsIncluded],
      baseRate: Number(baseRate || 300),
      active: true,
    });

    res.status(201).json({
      success: true,
      message: 'Service created successfully.',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update service (Admin)
// @route   PUT /api/services/:id
// @access  Private/Admin
const updateService = async (req, res, next) => {
  try {
    const service = await Service.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    res.status(200).json({
      success: true,
      message: 'Service updated successfully.',
      data: service,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete service (Admin)
// @route   DELETE /api/services/:id
// @access  Private/Admin
const deleteService = async (req, res, next) => {
  try {
    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    service.active = false;
    await service.save();

    res.status(200).json({
      success: true,
      message: 'Service deactivated successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllServices,
  getServiceBySlug,
  createService,
  updateService,
  deleteService,
};
