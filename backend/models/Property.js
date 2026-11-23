const { mongoose } = require("../config/db");
const imageSchema = new mongoose.Schema({ url: { type: String, required: true }, publicId: { type: String, default: "" }, isMain: { type: Boolean, default: false } }, { _id: false });
const schema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, minlength: 4, maxlength: 160 },
  description: { type: String, required: true, trim: true, minlength: 20, maxlength: 10000 },
  propertyType: { type: String, enum: ["Apartment", "Independent House", "Villa", "Plot", "Commercial", "Office", "Shop", "Other", "Penthouse", "House"], required: true, index: true },
  listingType: { type: String, enum: ["Sale", "Rent"], required: true, index: true },
  price: { type: Number, required: true, min: 1, index: true },
  address: { type: String, required: true, trim: true, maxlength: 300 },
  location: { type: String, required: true, trim: true, maxlength: 120, index: true },
  city: { type: String, required: true, trim: true, maxlength: 100, index: true },
  state: { type: String, required: true, trim: true, maxlength: 100 },
  pincode: { type: String, trim: true, maxlength: 12, default: "" },
  coordinates: { type: { type: String, enum: ["Point"] }, coordinates: { type: [Number] } },
  areaSqFt: { type: Number, required: true, min: 1, index: true },
  bedrooms: { type: Number, min: 0, max: 100, default: 0 },
  bathrooms: { type: Number, min: 0, max: 100, default: 0 },
  balconies: { type: Number, min: 0, max: 100, default: 0 },
  furnishing: { type: String, enum: ["Unfurnished", "Semi-furnished", "Furnished"], default: "Unfurnished" },
  floor: { type: Number, min: 0, default: 0 },
  totalFloors: { type: Number, min: 1, default: 1 },
  parking: { type: String, maxlength: 100, default: "" },
  amenities: [{ type: String, trim: true, maxlength: 100 }],
  images: { type: [imageSchema], default: [] },
  featuredImage: { type: String, default: "" },
  contactPhone: { type: String, trim: true, maxlength: 30, default: "" },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  ownerRole: { type: String, enum: ["broker", "seller"], required: true, index: true },
  broker: { type: mongoose.Schema.Types.ObjectId, ref: "BrokerProfile", default: null, index: true },
  approvalStatus: { type: String, enum: ["Pending", "Approved", "Rejected"], default: "Pending", index: true },
  listingStatus: { type: String, enum: ["Draft", "Active", "Inactive", "Sold", "Rented"], default: "Draft", index: true },
  featured: { type: Boolean, default: false, index: true },
  demoListing: { type: Boolean, default: false, index: true },
  rejectionReason: { type: String, maxlength: 1000, default: "" },
  views: { type: Number, min: 0, default: 0 }
}, { timestamps: true });
schema.index({ approvalStatus: 1, listingStatus: 1, city: 1, propertyType: 1, listingType: 1, price: 1 });
schema.index({ title: "text", description: "text", city: "text", location: "text" });
module.exports = mongoose.models.Property || mongoose.model("Property", schema);
