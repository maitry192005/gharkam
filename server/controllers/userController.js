const User = require('../models/User');
const HelperProfile = require('../models/HelperProfile');
const Favourite = require('../models/Favourite');
const Address = require('../models/Address');

// @desc    Update user profile & avatar
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { fullName, phone, gender, state, district, addressLine, landmark, pincode, houseType } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    if (fullName) user.fullName = fullName.trim();
    if (phone) user.phone = phone.trim();
    if (gender) user.gender = gender;

    user.address = {
      state: state !== undefined ? state : user.address.state,
      district: district !== undefined ? district : user.address.district,
      addressLine: addressLine !== undefined ? addressLine : user.address.addressLine,
      landmark: landmark !== undefined ? landmark : user.address.landmark,
      pincode: pincode !== undefined ? pincode : user.address.pincode,
      houseType: houseType !== undefined ? houseType : user.address.houseType,
    };

    if (req.file) {
      user.avatar = `/assets/uploads/profiles/${req.file.filename}`;
    }

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update Helper Specific Profile (bio, exp, languages, areas)
// @route   PUT /api/users/helper-profile
// @access  Private/Helper
const updateHelperDetails = async (req, res, next) => {
  try {
    const { bio, experience, languages, areas } = req.body;
    const profile = await HelperProfile.findOne({ user: req.user._id });

    if (!profile) {
      return res.status(404).json({ success: false, message: 'Helper profile not found.' });
    }

    if (bio !== undefined) profile.bio = bio;
    if (experience !== undefined) profile.experience = Number(experience);
    if (languages) {
      profile.languages = Array.isArray(languages)
        ? languages
        : languages.split(',').map((l) => l.trim()).filter(Boolean);
    }
    if (areas) {
      profile.areas = Array.isArray(areas)
        ? areas
        : areas.split(',').map((a) => a.trim()).filter(Boolean);
    }

    await profile.save();

    res.status(200).json({
      success: true,
      message: 'Professional details updated successfully.',
      data: profile,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get Saved Favourites
// @route   GET /api/users/favourites
// @access  Private/Customer
const getSavedHelpers = async (req, res, next) => {
  try {
    const favourites = await Favourite.find({ customer: req.user._id })
      .populate({
        path: 'helper',
        select: 'fullName username avatar address',
      })
      .sort({ createdAt: -1 });

    // Attach HelperProfile for each favourite helper
    const helperUserIds = favourites.map((f) => f.helper?._id).filter(Boolean);
    const profiles = await HelperProfile.find({ user: { $in: helperUserIds } }).populate('services.service');

    const profileMap = {};
    profiles.forEach((p) => {
      profileMap[p.user.toString()] = p;
    });

    const results = favourites.map((fav) => ({
      favouriteId: fav._id,
      helper: fav.helper,
      profile: fav.helper ? profileMap[fav.helper._id.toString()] : null,
      savedAt: fav.createdAt,
    }));

    res.status(200).json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Toggle Save / Favourite Helper
// @route   POST /api/users/favourites/:helperId
// @access  Private/Customer
const toggleFavourite = async (req, res, next) => {
  try {
    const helperId = req.params.helperId;
    const existing = await Favourite.findOne({ customer: req.user._id, helper: helperId });

    if (existing) {
      await Favourite.findByIdAndDelete(existing._id);
      return res.status(200).json({
        success: true,
        isSaved: false,
        message: 'Helper removed from favourites.',
      });
    }

    await Favourite.create({
      customer: req.user._id,
      helper: helperId,
    });

    res.status(200).json({
      success: true,
      isSaved: true,
      message: 'Helper saved to favourites! ❤️',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get user saved addresses
// @route   GET /api/users/addresses
// @access  Private
const getUserAddresses = async (req, res, next) => {
  try {
    const addresses = await Address.find({ user: req.user._id }).sort({ isDefault: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: addresses });
  } catch (error) {
    next(error);
  }
};

// @desc    Add new address
// @route   POST /api/users/addresses
// @access  Private
const addAddress = async (req, res, next) => {
  try {
    const { title, addressLine, landmark, district, state, pincode, houseType, isDefault } = req.body;

    if (isDefault) {
      await Address.updateMany({ user: req.user._id }, { isDefault: false });
    }

    const count = await Address.countDocuments({ user: req.user._id });

    const newAddress = await Address.create({
      user: req.user._id,
      title: title || 'Home',
      addressLine,
      landmark: landmark || '',
      district,
      state,
      pincode,
      houseType: houseType || 'Apartment',
      isDefault: isDefault || count === 0,
    });

    res.status(201).json({
      success: true,
      message: 'Address saved successfully.',
      data: newAddress,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete saved address
// @route   DELETE /api/users/addresses/:id
// @access  Private
const deleteAddress = async (req, res, next) => {
  try {
    await Address.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.status(200).json({ success: true, message: 'Address removed successfully.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  updateProfile,
  updateHelperDetails,
  getSavedHelpers,
  toggleFavourite,
  getUserAddresses,
  addAddress,
  deleteAddress,
};
