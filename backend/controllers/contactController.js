const ContactMessage = require("../models/ContactMessage");
const { email, phone, string, page, objectId } = require("../utils/validation");
const { writeAudit } = require("../utils/audit");

async function create(req, res) {
  const item = await ContactMessage.create({
    name: string(req.body.name, "Name", 2, 100),
    email: email(req.body.email),
    phone: phone(req.body.phone),
    inquiryType: string(req.body.inquiryType, "Interest", 2, 100),
    message: string(req.body.message, "Message", 8, 3000)
  });
  res.status(201).json({
    success: true,
    message: "Thanks for contacting NESTORA. Your message has been received.",
    id: item.id
  });
}

async function adminList(req, res) {
  const { page: pageNumber, limit, skip } = page(req.query);
  const filter = {};
  if (req.query.status) {
    if (!["New", "In Progress", "Closed"].includes(req.query.status)) {
      return res.status(400).json({ success: false, message: "Invalid contact message status" });
    }
    filter.status = req.query.status;
  }
  const [items, total] = await Promise.all([
    ContactMessage.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ContactMessage.countDocuments(filter)
  ]);
  res.json({
    success: true,
    items: items.map(item => ({ ...item, id: item._id.toString() })),
    pagination: { page: pageNumber, limit, total, pages: Math.ceil(total / limit) }
  });
}

async function update(req, res) {
  const item = await ContactMessage.findById(objectId(req.params.id));
  if (!item) return res.status(404).json({ success: false, message: "Contact message not found" });
  const status = string(req.body.status, "Status", 3, 20);
  if (!["New", "In Progress", "Closed"].includes(status)) {
    return res.status(400).json({ success: false, message: "Invalid contact message status" });
  }
  item.status = status;
  await item.save();
  await writeAudit(req.user._id, "contact-message.status.updated", "ContactMessage", item._id, { status });
  res.json({ success: true, message: "Contact message updated", status: item.status });
}

module.exports = { create, adminList, update };
