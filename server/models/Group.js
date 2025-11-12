const mongoose = require('mongoose');
const GroupSchema = new mongoose.Schema({
    groupName: { type: String, required: true },
    groupLogo: { type: String },
    ManagerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Manager', required: true },
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    messages: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Message' }],
    description: { type: String },
    groupType: { type: String, default: 'business' },
    inviteLinks: [{ type: String }],
    settings: { type: Object },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Group', GroupSchema);
