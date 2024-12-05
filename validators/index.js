const login = require('./login.validator');
const OTP = require('./otp.validator');
const resendOTP = require('./resendotp.validator');
const bookmark = require('./bookmark.validator');
const addLead = require('./addLead.validator');
const addLeadFromWebsite = require('./addLeadFromWebsite.validator');
const editLead = require('./editLead.validator');
const addFollowups = require('./addFollowups.validator');
const addMessage = require('./addMessage.validator');

module.exports = {
    login,
    bookmark,
    addLead,
    addLeadFromWebsite,
    editLead,
    addFollowups,
    addMessage,
    OTP,
    resendOTP
}