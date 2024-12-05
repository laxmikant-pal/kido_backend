const mongoose = require("mongoose");
const _ = require('lodash');
const Center = mongoose.model("Center");
const Followup = mongoose.model('Followup');
const Lead = mongoose.model("Lead");
const momentZone = require('moment-timezone');
const moment = require("moment");
const helper = require("../../handlers/helper");
const axios = require('axios');
const mail = require("../../handlers/mail");
const FACEBOOK_PAGE_ACCESS_TOKEN = '';

exports.getTest = (req, res, next) => {
  return res.send('working');
};

exports.getFBLeadsWebhook = async (req, res, next) => {
  try {
    if (req.query['hub.verify_token'] === 'asdf@1234') {
      res.send(req.query['hub.challenge']);
      return;
    } else {
      console.log('Verify token not verified. Please try again in sometime.');
      return;
    }
  } catch (err) {
    console.log('ERR in Fetching FB LEADSSSS');
    console.log(err);
  }
};

// Process incoming leads
async function processNewLead(leadId) {
  let response;
  let valArr = [];

  try {
    // Get lead details by lead ID from Facebook API
    response = await axios.get(`https://graph.facebook.com/v17.0/${leadId}/?fields=ad_id,adset_id,adset_name,campaign_id,campaign_name,created_time,custom_disclaimer_responses,field_data,form_id,home_listing,id,is_organic,partner_name,platform,post,retailer_item_id,vehicle,ad_name&access_token=${FACEBOOK_PAGE_ACCESS_TOKEN}`);
  }
  catch (err) {
    console.log('ERR in processing.....');
      // Log errors
      return console.warn(`An invalid response was received from the Facebook API:`, err.response.data ? JSON.stringify(err.response.data) : err.response);
  }

  // console.log(response.data, "-----------response");

  // Ensure valid API response returned
  if (!response.data || (response.data && (response.data.error || !response.data.field_data))) {
      return console.warn(`An invalid response was received from the Facebook API: ${response}`);
  }

  let lead = response.data;
  // Lead fields
  const leadObj = {
    lead_source: lead.platform == "fb" ? "Facebook" : lead.platform == "ig" ? "Instagram" : "",
    campaign_name: lead.campaign_name,
    adset_name: lead.adset_name,
    ad_name: lead.ad_name,
    createdAt: lead.created_time,
    platform: lead.platform
  };

  // Extract fields
  for (const field of lead.field_data) {
      // Get field name & value
      const fieldName = field.name;
      const fieldValue = field.values[0];
      valArr.push(fieldValue);
      leadObj[fieldName] = fieldValue
  }
  leadObj["find_center"] = valArr;

  // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");
  // console.log("leadObj--------------", leadObj);
  // console.log("$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$$");

  console.log("==================================================");
  console.log('valArr-------', JSON.stringify(valArr));
  console.log("==================================================");

  return leadObj;

  // Use a library like "nodemailer" to notify you about the new lead
  //
  // Send plaintext e-mail with nodemailer
  // transporter.sendMail({
  //     from: `Admin <admin@example.com>`,
  //     to: `You <you@example.com>`,
  //     subject: 'New Lead: ' + name,
  //     text: new Buffer(leadInfo),
  //     headers: { 'X-Entity-Ref-ID': 1 }
  // }, function (err) {
  //     if (err) return console.log(err);
  //     console.log('Message sent successfully.');
  // });
}

exports.postFBLeadsWebhook = async (req, res, next) => {
  try {
    let finSocialData;
    let foundCenter;
    let mailSent = 0;
    const dateByTimeZone = momentZone.tz(Date.now(), "Asia/Kolkata");
    const latestLeadCount = await helper.leadCounter();
    if (!req.body.entry) {
      return res.status(500).send({ error: 'Invalid POST data received' });
    }

    // Travere entries & changes and process lead IDs
    for (const entry of req.body.entry) {
      for (const change of entry.changes) {
          // Process new lead (leadgen_id)
          // console.log(change, "----this is change");
          finSocialData = await processNewLead(change.value.leadgen_id);
      }
    }

    console.log("FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL ");
    console.log(finSocialData);
    console.log("FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL FINAL ");

    const leadFF = await Lead
      .findOne({ email: finSocialData.email.trim() })
      .populate({
        path: "status_id"
      })
      .populate({
        path: "substatus_id"
      });
    if (leadFF) {
      // Duplicate lead
      // console.log(`Lead already present: ${leadFF.lead_no}`);
      // return res.send({ success: true });
      let flDate = momentZone.tz(new Date(), "Asia/Kolkata");
      let flTime = "";
      const followupsOrder = await Followup.countDocuments({ lead_id: leadFF._id });
      const notesLeadDup = _.omit(finSocialData, 'find_center', 'center', 'mail_sent', 'createdAt');

      const newFollowUp = new Followup({
        status_id: leadFF.status_id._id,
        follow_status: leadFF.status_id.name,
        follow_sub_status: leadFF.substatus_id.name,
        substatus_id: leadFF.substatus_id._id,
        action_taken: [],
        enq_stage: leadFF.stage,
        program_id: leadFF.program_id,
        parent_know_aboutus: leadFF.parent_know_aboutus || [],
        type: leadFF.type,
        notes: finSocialData.platform == "fb" ? "Facebook (Duplicate)" : finSocialData.platform == "ig" ? "Instagram (Duplicate)" : "Digital lead",
        notes: JSON.stringify(notesLeadDup),
        follow_up_date: flDate,
        follow_up_time: "",
        date_sort: moment(`${flDate}T${flTime}Z`).toISOString(),
        remark: "",
        updatedBy_name: finSocialData.platform == "fb" ? "Facebook" : finSocialData.platform == "ig" ? "Instagram" : "Digital lead",
        updatedBy: mongoose.Types.ObjectId("63b407739d6efd6f19cf0716"),
        lead_id: leadFF._id,
        center_id: leadFF.school_id,
        someday: 0,
        no_followup: 0,
        country_id: leadFF.country_id || null,
        zone_id: leadFF.zone_id || null,
        source_category: finSocialData.campaign_name && finSocialData.campaign_name.includes("Event") ? "database/events" : "digital-lead",
        lead_no: leadFF.lead_no,
        lead_name: leadFF.parent_name || "",
        child_name: leadFF.child_first_name ? `${leadFF.child_first_name} ${leadFF.child_last_name}` : "",
        is_whatsapp: 0,
        is_email: 0,
        not_to_show: 0,
        comm_mode: "",
        order: followupsOrder + 1
      });
      await newFollowUp.save();
      leadFF.is_external = 2; // duplicate lead flag
      leadFF.is_dup = 1; // this lead is duplicated
      leadFF.dup_no = leadFF && leadFF.dup_no ? parseInt(leadFF.dup_no) + 1 : 1; // increase count by 1 for duplicate leads
      leadFF.updatedAt = flDate;
      leadFF.follow_due_date = flDate;
      await leadFF.save();
      return res.send({ success: true });
    } else {
      const centerToStr = finSocialData.find_center.toString();
      const finStr = centerToStr.replace(/_/g, ' ');

      foundCenter = await Center.find({
        $text: {
          $search: finStr
        }
      });

      if (foundCenter && foundCenter.length) {
        foundCenter = foundCenter[0]._id;
        mailSent = 1;
      } else {
        foundCenter = mongoose.Types.ObjectId("64a26f270754b33d31c62b79");
        mailSent = 0;
      }

      console.log(foundCenter);

      const zone = await Center.findOne({ _id: foundCenter });

      const notesLead = _.omit(finSocialData, 'find_center', 'center', 'mail_sent', 'createdAt');

      const newLead = new Lead({
        lead_date: dateByTimeZone,
        lead_no: latestLeadCount,
        child_first_name: "",
        child_last_name: "",
        child_gender: "",
        child_pre_school: "",
        programcategory_id: mongoose.Types.ObjectId("64a27694d081b651a5b83db4"),
        program_id: mongoose.Types.ObjectId("64a276bdd081b651a5b83db8"),
        school_id: foundCenter,
        zone_id: zone ? zone.zone_id : null,
        country_id: zone ? zone.country_id : null,
        viewoption: null,
        primary_parent: "Guardian",
        parent_name: finSocialData.full_name,
        parent_first_contact: finSocialData.phone_number,
        parent_second_contact: "",
        parent_email: finSocialData.email,
        parent_education: "",
        parent_profession: "",
        secondary_parent_name: "",
        secondary_parent_type: "",
        secondary_first_contact: "",
        secondary_Second_contact: "",
        secondary_second_whatsapp: 0,
        secondary_first_whatsapp: 0,
        secondary_whatsapp: "",
        secondary_email: "",
        secondary_education: "",
        secondary_profession: "",
        parent_landmark: "",
        parent_house: "",
        parent_street: "",
        parent_address: "",
        parent_country: null,
        parent_state: null,
        parent_pincode: "",
        parent_area: "",
        parent_city: null,
        parent_know_aboutus: finSocialData.platform == "fb" ? ["Facebook"] : finSocialData.platform == "ig" ? ["Instagram"] : [],
        parent_whatsapp: finSocialData.phone_number,
        parent_second_whatsapp: 0,
        parent_first_whatsapp: 1,
        source_category: finSocialData.campaign_name && finSocialData.campaign_name.includes("Event") ? "database/events" : "digital-lead",
        status_id: mongoose.Types.ObjectId("63b3fa85f1f372a8e4fdb0e1"),
        substatus_id: mongoose.Types.ObjectId("63b3fb6ff1f372a8e4fdb0eb"),
        stage: "New Lead",
        remark: JSON.stringify(notesLead),
        updatedBy_name: finSocialData.platform == "fb" ? "Facebook" : finSocialData.platform == "ig" ? "Instagram" : "Digital lead",
        createdBy_name: finSocialData.platform == "fb" ? "Facebook" : finSocialData.platform == "ig" ? "Instagram" : "Digital lead",
        action_taken: [],
        type: "lead",
        initial_status: mongoose.Types.ObjectId("63b3fa85f1f372a8e4fdb0e1"),
        initial_sub_status: mongoose.Types.ObjectId("63b3fb6ff1f372a8e4fdb0eb"),
        initial_action: [],
        initial_stage: "New Lead",
        initial_notes: JSON.stringify(notesLead),
        enrolled: 0,
        follow_due_date: dateByTimeZone,
        follow_due_time : "",
        is_external: 1,
        external_source: finSocialData.platform == "fb" ? "Facebook" : finSocialData.platform == "ig" ? "Instagram" : "Digital lead",
        sibling: 0,
        is_related: null,
        cor_parent: "",
        company_name_parent: ""
      });
      await newLead.save();
      if (mailSent) {
        await mail.send({
          user: finSocialData.email,
          subject: `Welcome to Kido International Preschool & Daycare`,
          msg: {
            lead_name: finSocialData.full_name || "",
            center_name: zone.school_display_name || "",
            center_main_name: zone.school_name || "",
            center_area: zone.area || "",
            sal: zone.cor_sal || "",
            spoc: zone.cor_spoc || "",
            email: zone.email_id || "",
            whatsapp: zone.whatsapp_number,
            contact: zone.contact_number || "",
            video: zone.center_video_url || "",
            website: zone.website_url || "",
            designation: zone.designation || "",
            entity_name: zone.cor_entity_name || "",
            activities: zone.activities_portal || "",
            address: { house: zone.house_no, street: zone.street, landmark: zone.landmark, area: zone.area, city: zone.city, state: zone.state, pincode: zone.pincode }
          },
          filename: "email-welcome-lead",
          title: `KIDO India`,
        });
      }
    }
    return res.send({ success: true });
  } catch (err) {
    console.log(err);
  }
};
