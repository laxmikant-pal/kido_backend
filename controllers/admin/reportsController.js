const mongoose = require('mongoose');
const _ = require('lodash');
const Lead = mongoose.model("Lead");
const Country = mongoose.model("Country");
const Zone = mongoose.model("Zone");
const Center = mongoose.model("Center");
const ViewOption = mongoose.model("ViewOption");
const excel = require('node-excel-export');
const momentZone = require('moment-timezone');
const moment = require("moment");
const helper = require("../../handlers/helper");

const dueDateFormatWithMoment = (data, dueTime) => {
  var regex = /\ba\b/;
  let dueDate = moment.utc(data).tz("Asia/Kolkata").format("MM/DD/YYYY");
  if (data) {
    if (dueTime) {
      var mainData = moment(`${dueDate} ${dueTime}`).fromNow();
      if (regex.test(mainData)) {
        mainData = mainData.replace("a", 1)
      }
      return `${data ? mainData : ""}`
    } else {
      var mainData = moment(`${data}`).fromNow();
      if (regex.test(mainData)) {
        mainData = mainData.replace("a", 1)
      }
      return `${data ? mainData : ""}`
    }
  } else {
    return "";
  }
}

const dueDateFormat = (data, dueTime, leadDate, doFollow, someDayFollow) => {
  let dueDate = moment.utc(data).tz("Asia/Kolkata").format("MM/DD/YYYY");
  if (data) {
    if (dueTime) {
      return `${dueDate} ${dueTime}`;
    } else {
      if (doFollow == 0 || someDayFollow == 0) {
        return "";
      } else {
        return `${moment.utc(leadDate).tz("Asia/Kolkata").format("MM/DD/YYYY h:mm A")}`;
      }
    }
  } else {
    return "";
  }
};

const getLeadStage = (stage) => {
  var finStage = "";
  if (stage == "New Lead") {
    finStage = "1. New Lead";
  } else if (stage == "Enquiry Received") {
    finStage = "2. Enquiry Received";
  } else if (stage == "Tour Booked") {
    finStage = "3. Tour Booked";
  } else if (stage == "Closed-Lead Lost") {
    finStage = "4. Closed-Lead Lost";
  } else if (stage == "Post Tour") {
    finStage = "5. Post Tour";
  } else if (stage == "Closed-Enquiry Lost") {
    finStage = "6. Closed-Enquiry Lost";
  } else if (stage == "Closed - Won") {
    finStage = "7. Closed - Won";
  } else {
    finStage = stage;
  }
  return finStage;
};

const getSourceCatName = (sourceCat) => {
  let sourceCategory = "";
  if (sourceCat == "direct-walk-in") {
    sourceCategory = "Direct Walk In";
  } else if (sourceCat == "database/events") {
    sourceCategory = "Database/Events";
  } else if (sourceCat == "digital-lead") {
    sourceCategory = "Digital Lead";
  } else {
    sourceCategory = sourceCat;
  }
  return sourceCategory;
};

const getLeadType = (type) => {
  let leadType = "";
  if (type == "lead") {
    leadType = "LEAD";
  } else if (type == "enquiry") {
    leadType = "WALK-INS";
  } else {
    leadType = type;
  }
  return leadType;
};

exports.exportLeads = async (req, res, next) => {
  try {
    const timeZone = momentZone.tz.guess();
    let currentDateTZ = moment.tz(moment(), "Asia/Kolkata");
    let currentDate = currentDateTZ.clone().tz("Asia/Kolkata");
    const sortingArr = ["lead_no", "lead_date", "updatedAt", "parent_name", "child_first_name", "child_last_name", "stage", "type", `${req.session.user.main && req.session.user.main == req.config.admin.main ? 'school_id.school_display_name' : 'child_first_name'}`, "parent_know_aboutus", "source_category", "programcategory_id.title", "program_id.program_name", "status_id.name", "lead_no"];
    let zoneCount = 0;
    let newArr = [];
    let findQue = {};

    let aggregateQue = [
      {
        '$lookup': {
          'from': 'countries',
          'localField': 'country_id',
          'foreignField': '_id',
          'as': 'country_name'
        }
      },
      {
        '$lookup': {
          'from': 'zones',
          'localField': 'zone_id',
          'foreignField': '_id',
          'as': 'zone_name'
        }
      },
      {
        '$lookup': {
          'from': 'statuses',
          'localField': 'status_id',
          'foreignField': '_id',
          'as': 'status_id'
        }
      }, {
        '$unwind': {
          'path': '$status_id',
          // 'includeArrayIndex': 'string',
          // 'preserveNullAndEmptyArrays': true
        }
      }, {
        '$lookup': {
          'from': 'substatuses',
          'localField': 'substatus_id',
          'foreignField': '_id',
          'as': 'substatus_name'
        }
      }, {
        '$unwind': {
          'path': '$substatus_name',
          // 'includeArrayIndex': 'string',
          // 'preserveNullAndEmptyArrays': true
        }
      }, {
        '$lookup': {
          'from': 'centers',
          'localField': 'school_id',
          'foreignField': '_id',
          'as': 'school_id'
        }
      }, {
        '$unwind': {
          'path': '$school_id'
        }
      }, {
        '$lookup': {
          'from': 'programcategories',
          'localField': 'programcategory_id',
          'foreignField': '_id',
          'as': 'programcategory_id'
        }
      }, {
        '$unwind': {
          'path': '$programcategory_id'
        }
      }, {
        '$lookup': {
          'from': 'programs',
          'localField': 'program_id',
          'foreignField': '_id',
          'as': 'program_id'
        }
      }, {
        '$unwind': {
          'path': '$program_id',
          'preserveNullAndEmptyArrays': true
        }
      }, {
        '$project': {
          'lead_no': 1,
          'lead_date': 1,
          'createdAt': 1,
          'updatedAt': 1,
          'parent_name': 1,
          'child_first_name': 1,
          'child_last_name': 1,
          'stage': 1,
          'type': 1,
          'school_id._id': 1,
          'school_id.school_display_name': 1,
          'school_id.zone_id': 1,
          'zone_id': 1,
          'source_category': 1,
          'parent_know_aboutus': 1,
          'programcategory_id.title': 1,
          'program_id.program_name': 1,
          'status_id.name': 1,
          'follow_due_date': 1,
          'follow_due_time': 1,
          // 'country_id': 1,
          'country_name': 1,
          'zone_name': 1,
          'substatus_name.name': 1,
          'action_taken': 1,
          'updatedBy_name': 1
        }
      },
      {
        '$sort': {
          'lead_date': -1
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      let centers = await Center.find({ status: "active" }).distinct('_id');
      findQue = {
        school_id: { $in: centers }
      };
      aggregateQue.unshift({
        '$match': {
          'school_id': { "$in": centers }
        }
      });
    } else {
      // NON ADMIN
      let centers = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
      findQue = {
        school_id: { $in: centers }
      };
      aggregateQue.unshift({
        '$match': {
          'school_id': { "$in": centers }
        }
      });
    }

    if (req.query.zone) {
      let zone = JSON.parse(req.query.zone).map(s => mongoose.Types.ObjectId(s));
      findQue = {
        zone_id: { $in: zone }
      };
      aggregateQue.unshift({
        '$match': {
          'zone_id': { $in: zone }
        }
      });
    }

    if (req.query.program) {
      let program = JSON.parse(req.query.program).map(s => mongoose.Types.ObjectId(s));
      findQue = {
        program_id: { $in: program }
      };
      aggregateQue.unshift({
        '$match': {
          'program_id': { $in: program }
        }
      });
    }

    if (req.query.know_us) {
      let know_us = JSON.parse(req.query.know_us)
      findQue = {
        parent_know_aboutus: { $in: know_us }
      };
      aggregateQue.unshift({
        '$match': {
          'parent_know_aboutus': { $in: know_us }
        }
      });
    }

    if (req.query.stardate) {
      let start = momentZone.tz(`${req.query.stardate}`, "Asia/Kolkata").startOf('day').toDate();
      let end = momentZone.tz(`${req.query.enddate}`, "Asia/Kolkata").endOf('day').toDate();
      findQue = {
        lead_date: {
          '$gte': start,
          '$lte': end
        }
      }
      aggregateQue.unshift({
        '$match': {
          'lead_date': {
            '$gte': start,
            '$lte': end
          }
        }
      });
    }

    if (req.query.country) {
      let country = JSON.parse(req.query.country).map(s => mongoose.Types.ObjectId(s));
      findQue = {
        country_id: { $in: country }
      };
      aggregateQue.unshift({
        '$match': {
          'country_id': { $in: country }
        }
      });
    }

    if (req.query.center) {
      let center = JSON.parse(req.query.center).map(s => mongoose.Types.ObjectId(s));
      findQue = {
        school_id: { $in: center }
      };
      aggregateQue.unshift({
        '$match': {
          'school_id': { $in: center }
        }
      });
    }

    if (req.query.status) {
      let status = JSON.parse(req.query.status).map(s => mongoose.Types.ObjectId(s));
      findQue = {
        status_id: { $in: status }
      };
      aggregateQue.unshift({
        '$match': {
          'status_id': { $in: status }
        }
      });
    }

    if (req.query.source_category) {
      findQue = {
        source_category: req.query.source_category
      };
      aggregateQue.unshift({
        '$match': {
          'source_category': req.query.source_category
        }
      });
    }

    if (req.query.stage) {
      findQue = {
        stage: req.query.stage
      };
      aggregateQue.unshift({
        '$match': {
          'stage': req.query.stage
        }
      });
    }

    // parent_name, // child_first_name, // lead_no
    if (req.query.search_key) {
      aggregateQue.unshift({
        '$match': {
          $or: [
            {
              parent_name: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            },
            {
              child_first_name: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            },
            {
              lead_no: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            },
            {
              child_last_name: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            }
          ]
        }
      });
    }

    // duplicate lead filter
    if (req.query.dup_leads == "true") {
      findQue = {
        is_dup: 1
      };
      aggregateQue.unshift({
        '$match': {
          'is_dup': 1
        }
      });
    }

    const leads = await Lead.aggregate(aggregateQue);
    if (leads.length > 0) {
      const specification = {
        sr_no: {
          displayName: "Sr No.",
          headerStyle: {},
          width: 50
        },
        country: {
          displayName: "Country",
          headerStyle: {},
          width: 100
        },
        zone: {
          displayName: "Zone",
          headerStyle: {},
          width: 100
        },
        center: {
          displayName: "Centre",
          headerStyle: {},
          width: 170
        },
        walkins: {
          displayName: "Lead/Walk-ins",
          headerStyle: {},
          width: 120
        },
        lead_id: {
          displayName: "Lead Id",
          headerStyle: {},
          width: 120
        },
        leadDate: {
          displayName: "Lead Date",
          headerStyle: {},
          width: 80
        },
        leadUpdatedDate: {
          displayName: "Updated Date",
          headerStyle: {},
          width: 90
        },
        dueIn: {
          displayName: "Due in",
          headerStyle: {},
          width: 110
        },
        leadName: {
          displayName: "Lead Name",
          headerStyle: {},
          width: 210
        },
        childFirstName: {
          displayName: "Child First Name",
          headerStyle: {},
          width: 120
        },
        childLastName: {
          displayName: "Child Last Name",
          headerStyle: {},
          width: 120
        },
        sourceCat: {
          displayName: "Source Category",
          headerStyle: {},
          width: 120
        },
        source: {
          displayName: "Source",
          headerStyle: {},
          width: 150
        },
        program: {
          displayName: "Program",
          headerStyle: {},
          width: 100
        },
        followUpDue: {
          displayName: "Follow-up due on",
          headerStyle: {},
          width: 160
        },
        stage: {
          displayName: "Stage",
          headerStyle: {},
          width: 120
        },
        status: {
          displayName: "Status",
          headerStyle: {},
          width: 140
        },
        subStatus: {
          displayName: "Substatus",
          headerStyle: {},
          width: 140
        },
        actionTaken: {
          displayName: "Action Planned",
          headerStyle: {},
          width: 170
        },
        notes: {
          displayName: "Notes",
          headerStyle: {},
          width: 170
        },
        updatedBy: {
          displayName: "Updated by",
          headerStyle: {},
          width: 130
        },
      }

      // all data
      const dataset = [];
      leads.map((lead, i) => {
        dataset.push({
          sr_no: parseInt(`${i + 1}`),
          country: lead.country_name && lead.country_name.length ? lead.country_name[0].country_name : "",
          zone: lead.zone_name && lead.zone_name.length ? lead.zone_name[0].name : "",
          center: lead.school_id.school_display_name,
          walkins: getLeadType(lead.type ? lead.type : ""),
          lead_id: lead.lead_no,
          leadDate: lead.lead_date ? moment.utc(lead.lead_date).tz("Asia/Kolkata").format("MM/DD/YYYY") : "",
          leadUpdatedDate: lead.updatedAt ? moment.utc(lead.updatedAt).tz("Asia/Kolkata").format("MM/DD/YYYY h:mm A") : "",
          dueIn: dueDateFormatWithMoment(lead.follow_due_date ? lead.follow_due_date : "", lead.follow_due_time),
          leadName: lead.parent_name ? lead.parent_name : "",
          childFirstName: lead.child_first_name ? lead.child_first_name : "",
          childLastName: lead.child_last_name ? lead.child_last_name : "",
          sourceCat: getSourceCatName(lead.source_category ? lead.source_category.trim() : "" || ""),
          source: lead.parent_know_aboutus && lead.parent_know_aboutus.length ? lead.parent_know_aboutus.toString() : "",
          program: lead.program_id && lead.program_id.program_name ? lead.program_id.program_name : "",
          followUpDue: dueDateFormat(lead.follow_due_date ? lead.follow_due_date : "", lead.follow_due_time, lead.lead_date, lead.do_followup, lead.someday_follow),
          stage: getLeadStage(lead.stage || ""),
          status: lead.status_id && lead.status_id.name ? lead.status_id.name : "",
          subStatus: lead.substatus_name && lead.substatus_name.name ? lead.substatus_name.name : "",
          actionTaken: lead.action_taken && lead.action_taken.length ? lead.action_taken.toString() : "",
          notes: lead.remark ? lead.remark : "",
          updatedBy: lead.updatedBy_name
        });
      });

      Promise.all(dataset)
        .then(result => {
          // Create the excel report. this is an array. Pass multiple sheets to create multi sheet report--
          // return;
          const report = excel.buildExport([
            {
              name: 'Report', // <- Specify sheet name (optional)
              merges: [], // <- Merge cell ranges
              specification: specification, // <- Report specification
              data: dataset // <-- Report data
            }
          ]);

          res.attachment(`Lead Export__${currentDate.format("DD-MMMM-YYYY hh:mm")}.xlsx`);
          return res.send(report);
        })
    } else {
      req.flash('error', 'No leads found');
      res.redirect('back');
      return;
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "exportLeads not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.exportLeadsWithoutLoop = async (req, res, next) => {
  try {
    const timeZone = momentZone.tz.guess();
    let aggregateQue = [
      {
        $lookup: {
          from: "countries",
          localField: "country_id",
          foreignField: "_id",
          as: "country_name"
        }
      },
      {
        $lookup: {
          from: "zones",
          localField: "zone_id",
          foreignField: "_id",
          as: "zone_name"
        }
      },
      {
        $lookup: {
          from: "statuses",
          localField: "status_id",
          foreignField: "_id",
          as: "status_id"
        }
      },
      {
        $unwind: {
          path: "$status_id",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "substatuses",
          localField: "substatus_id",
          foreignField: "_id",
          as: "substatus_name"
        }
      },
      {
        $unwind: {
          path: "$substatus_name",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "centers",
          localField: "school_id",
          foreignField: "_id",
          as: "school_id"
        }
      },
      {
        $unwind: "$school_id"
      },
      {
        $lookup: {
          from: "programcategories",
          localField: "programcategory_id",
          foreignField: "_id",
          as: "programcategory_id"
        }
      },
      {
        $unwind: "$programcategory_id"
      },
      {
        $lookup: {
          from: "programs",
          localField: "program_id",
          foreignField: "_id",
          as: "program_id"
        }
      },
      {
        $unwind: {
          path: "$program_id",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          sr_no: { $add: [{ $indexOfArray: [[], ""] }, 1] }, // Placeholder for sr_no, you may need to adjust this according to your requirement
          country: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$country_name", []] } }, 0] },
              { $arrayElemAt: ["$country_name.country_name", 0] },
              ""
            ]
          },
          zone: {
            $cond: [
              { $gt: [{ $size: { $ifNull: ["$zone_name", []] } }, 0] },
              { $arrayElemAt: ["$zone_name.name", 0] },
              ""
            ]
          },
          center: "$school_id.school_display_name",
          walkins: "",
          lead_id: "$lead_no",
          leadDate: { $dateToString: { format: "%m/%d/%Y", date: "$lead_date" } },
          leadUpdatedDate: { $dateToString: { format: "%m/%d/%Y", date: "$updatedAt" } },
          dueIn: {
            $function: {
              body: function (data, dueTime) {
                var regex = /\ba\b/;
                let dueDate = moment(data).format("MM/DD/YYYY");
                if (data) {
                  if (dueTime) {
                    var mainData = moment(`${dueDate} ${dueTime}`).fromNow();
                    if (regex.test(mainData)) {
                      mainData = mainData.replace("a", 1)
                    }
                    return `${data ? mainData : ""}`
                  } else {
                    var mainData = moment(`${data}`).fromNow();
                    if (regex.test(mainData)) {
                      mainData = mainData.replace("a", 1)
                    }
                    return `${data ? mainData : ""}`
                  }
                } else {
                  return "";
                }
              },
              args: ["$follow_due_date", "$follow_due_time"],
              lang: "js"
            }
          },
          leadName: { $ifNull: ["$parent_name", ""] },
          childFirstName: { $ifNull: ["$child_first_name", ""] },
          childLastName: { $ifNull: ["$child_last_name", ""] },
          sourceCat: { $ifNull: ["$source_category", ""] },
          source: {
            $cond: [
              { $gt: [{ $ifNull: ["$parent_know_aboutus", ""] }, ""] },
              { $arrayElemAt: ["$parent_know_aboutus", 0] },
              ""
            ]
          },
          program: {
            $cond: [
              { $gt: [{ $ifNull: ["$program_id", ""] }, ""] },
              "$program_id.program_name",
              ""
            ]
          },
          followUpDue: {
            $concat: [
              { $ifNull: [{ $dateToString: { format: "%m/%d/%Y", date: "$follow_due_date" } }, ""] },
              " ",
              { $ifNull: ["$follow_due_time", ""] }
            ]
          },
          stage: "$stage",
          status: {
            $cond: [
              { $gt: [{ $ifNull: ["$status_id", ""] }, ""] },
              "$status_id.name",
              ""
            ]
          },
          subStatus: {
            $cond: [
              { $gt: [{ $ifNull: ["$substatus_name", ""] }, ""] },
              "$substatus_name.name",
              ""
            ]
          },
          actionTaken: {
            $cond: [
              { $gt: [{ $ifNull: ["$action_taken", ""] }, ""] },
              { $arrayElemAt: ["$action_taken", 0] },
              ""
            ]
          },
          notes: { $ifNull: ["$remark", ""] },
          updatedBy: { $ifNull: ["$updatedBy_name", ""] }
        }
      },
      {
        $sort: {
          lead_date: -1
        }
      }
    ]

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      let centers = await Center.find({ status: "active" }).distinct('_id');
      findQue = {
        school_id: { $in: centers }
      };
      aggregateQue.unshift({
        '$match': {
          'school_id': { "$in": centers }
        }
      });
    } else {
      // NON ADMIN
      let centers = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
      findQue = {
        school_id: { $in: centers }
      };
      aggregateQue.unshift({
        '$match': {
          'school_id': { "$in": centers }
        }
      });
    }

    if (req.query.zone) {
      let zone = req.query.zone.map(s => mongoose.Types.ObjectId(s));
      findQue = {
        zone_id: { $in: zone }
      };
      aggregateQue.unshift({
        '$match': {
          'zone_id': { $in: zone }
        }
      });
    }

    if (req.query.program) {
      let program = req.query.program.map(s => mongoose.Types.ObjectId(s));
      findQue = {
        program_id: { $in: program }
      };
      aggregateQue.unshift({
        '$match': {
          'program_id': { $in: program }
        }
      });
    }

    if (req.query.know_us) {
      let know_us = req.query.know_us
      findQue = {
        parent_know_aboutus: { $in: know_us }
      };
      aggregateQue.unshift({
        '$match': {
          'parent_know_aboutus': { $in: know_us }
        }
      });
    }

    if (req.query.stardate) {
      let start = momentZone.tz(`${req.query.stardate}`, "Asia/Kolkata").startOf('day').toDate();
      let end = momentZone.tz(`${req.query.enddate}`, "Asia/Kolkata").endOf('day').toDate();
      findQue = {
        lead_date: {
          '$gte': start,
          '$lte': end
        }
      }
      aggregateQue.unshift({
        '$match': {
          'lead_date': {
            '$gte': start,
            '$lte': end
          }
        }
      });
    }

    if (req.query.country) {
      let country = req.query.country.map(s => mongoose.Types.ObjectId(s));
      findQue = {
        country_id: { $in: country }
      };
      aggregateQue.unshift({
        '$match': {
          'country_id': { $in: country }
        }
      });
    }

    if (req.query.center) {
      let center = req.query.center.map(s => mongoose.Types.ObjectId(s));
      findQue = {
        school_id: { $in: center }
      };
      aggregateQue.unshift({
        '$match': {
          'school_id': { $in: center }
        }
      });
    }

    if (req.query.status) {
      let status = req.query.status.map(s => mongoose.Types.ObjectId(s));
      findQue = {
        status_id: { $in: status }
      };
      aggregateQue.unshift({
        '$match': {
          'status_id': { $in: status }
        }
      });
    }

    if (req.query.source_category) {
      findQue = {
        source_category: req.query.source_category
      };
      aggregateQue.unshift({
        '$match': {
          'source_category': req.query.source_category
        }
      });
    }

    if (req.query.stage) {
      findQue = {
        stage: req.query.stage
      };
      aggregateQue.unshift({
        '$match': {
          'stage': req.query.stage
        }
      });
    }

    // parent_name, // child_first_name, // lead_no
    if (req.query.search_key) {
      aggregateQue.unshift({
        '$match': {
          $or: [
            {
              parent_name: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            },
            {
              child_first_name: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            },
            {
              lead_no: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            },
            {
              child_last_name: {
                $regex: req.query.search_key,
                $options: 'i'
              }
            }
          ]
        }
      });
    }

    const leads = await Lead.aggregate(aggregateQue);
    res.send(leads);
  } catch (err) {
    helper.errorDetailsForControllers(err, "exportLeads not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.postHeaderDyamically = async (req, res, next) => {
  try {
    let countries = [];
    let zones = [];
    let centers = [];

    if (req.body.country_id && req.body.country_id.length) {
      countries = req.body.country_id.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.body.zone_id && req.body.zone_id.length) {
      zones = req.body.zone_id.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.body.center_id && req.body.center_id.length) {
      centers = req.body.center_id.map(s => mongoose.Types.ObjectId(s));
    }

    const zonesWithCentersGrouped = await Center.getZonesWithCentersGroupedAjax(countries, zones, centers);
    res.status(200).json({
      message: "MTD header dynamically",
      data: zonesWithCentersGrouped,
      code: 200
    });
    return;
  } catch (err) {
    helper.errorDetailsForControllers(err, "postHeaderDyamically not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.postHeaderDyamicallyNonAdmin = async (req, res, next) => {
  try {
    let countries = [];
    let zones = [];
    let centers = [];

    if (req.body.country_id && req.body.country_id.length) {
      countries = req.body.country_id.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.body.zone_id && req.body.zone_id.length) {
      zones = req.body.zone_id.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.body.center_id && req.body.center_id.length) {
      centers = req.body.center_id.map(s => mongoose.Types.ObjectId(s));
    }

    let centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
    const zonesWithCentersGrouped = await Center.getZonesWithCentersGroupedAjaxNonAdmin(countries, zones, centers && centers.length ? centers : centersObj);
    res.status(200).json({
      message: "MTD header dynamically",
      data: zonesWithCentersGrouped,
      code: 200
    });
    return;
  } catch (err) {
    helper.errorDetailsForControllers(err, "postHeaderDyamicallyNonAdmin not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

const processReportsMTD = async (currPage, length, countries, zones, centers, start, end) => {
  return new Promise(async (resolve, reject) => {
    const timeZone = momentZone.tz.guess();
    const repArr = [];
    const resultsPerPage = length;
    const currentPage = currPage;
    const currentDate = moment().tz("Asia/Kolkata");

    let startMonthDate;
    let endMonthDate;

    if (start || end) {
      startMonthDate = momentZone.tz(`${start}`, "Asia/Kolkata").startOf('day').toDate();
      endMonthDate = momentZone.tz(`${end}`, "Asia/Kolkata").endOf('day').toDate();
    } else {
      // by default date range should be current month
      startMonthDate = currentDate.clone().startOf('month');
      endMonthDate = currentDate.clone().endOf('month');
    }

    // get start date and end date of a month
    const startDate = moment(startMonthDate, 'YYYY/MM/DD')
    const endDate = moment(endMonthDate, 'YYYY/MM/DD');

    // Calculate the number of days between the start and end dates
    const numDays = endDate.diff(startDate, 'days') + 1;

    // Generate an array of dates using Lodash range function
    const dateRange = _.range(numDays).map((index) => moment(startDate).add(index, 'days').format('YYYY-MM-DD'));

    // Divide the dateRange into smaller chunks
    const paginatedDates = _.chunk(dateRange, resultsPerPage);

    // Retrieve the dates for the current page
    const currentPageDates = paginatedDates[currentPage - 1];

    const zonesWithCentersGrouped = await Center.getZonesWithCentersGrouped(countries, zones, centers);
    const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
    const listOfSchoolsWithIds = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_id);

    if (zonesWithCentersGrouped && zonesWithCentersGrouped.length) {
      for (const date of currentPageDates) {
        const repObj = {
          date: moment(date).format("DD-MMMM-YYYY")
        };
        let total = 0; // Initialize the total to 0
        for (const [i, center_id] of listOfSchoolsWithIds.entries()) {
          // const leadCount = await Lead.reportCountDefault(date, timeZone, center_id);
          let leadCount = await Lead.find({
            lead_date: {
              $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
              $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
            },
            school_id: center_id
          }, { lead_no: 1 });
          leadCount = leadCount.length;
          repObj[`rep_${i}`] = leadCount;
          total += leadCount; // Add the lead count to the total
        }
        // repObj.total = `<strong>${total}</strong>`;
        repObj.total = total;
        repArr.push(repObj);
      }
    }

    resolve({
      zonesWithCentersGrouped,
      listOfSchools,
      repArr,
      noOfDays: zonesWithCentersGrouped.length ? numDays : 0
    });
  });
};

const processReportsMTDNonAdmin = async (currPage, length, countries, zones, centers, start, end) => {
  return new Promise(async (resolve, reject) => {
    const timeZone = momentZone.tz.guess();
    const repArr = [];
    const resultsPerPage = length;
    const currentPage = currPage;
    const currentDate = moment().tz("Asia/Kolkata");

    let startMonthDate;
    let endMonthDate;

    if (start || end) {
      startMonthDate = momentZone.tz(`${start}`, "Asia/Kolkata").startOf('day').toDate();
      endMonthDate = momentZone.tz(`${end}`, "Asia/Kolkata").endOf('day').toDate();
    } else {
      // by default date range should be current month
      startMonthDate = currentDate.clone().startOf('month');
      endMonthDate = currentDate.clone().endOf('month');
    }

    // get start date and end date of a month
    const startDate = moment(startMonthDate, 'YYYY/MM/DD')
    const endDate = moment(endMonthDate, 'YYYY/MM/DD');

    // Calculate the number of days between the start and end dates
    const numDays = endDate.diff(startDate, 'days') + 1;

    // Generate an array of dates using Lodash range function
    const dateRange = _.range(numDays).map((index) => moment(startDate).add(index, 'days').format('YYYY-MM-DD'));

    // Divide the dateRange into smaller chunks
    const paginatedDates = _.chunk(dateRange, resultsPerPage);

    // Retrieve the dates for the current page
    const currentPageDates = paginatedDates[currentPage - 1];

    const zonesWithCentersGrouped = await Center.getZonesWithCentersGroupedNonAdmin(centers, countries, zones);
    const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
    const listOfSchoolsWithIds = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_id);

    if (zonesWithCentersGrouped && zonesWithCentersGrouped.length) {
      for (const date of currentPageDates) {
        const repObj = {
          date: moment(date).format("DD-MMMM-YYYY")
        };
        let total = 0; // Initialize the total to 0
        for (const [i, center_id] of listOfSchoolsWithIds.entries()) {
          // const leadCount = await Lead.reportCountDefault(date, timeZone, center_id);
          let leadCount = await Lead.find({
            lead_date: {
              $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
              $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
            },
            school_id: center_id
          }, { lead_no: 1 });
          leadCount = leadCount.length;
          repObj[`rep_${i}`] = leadCount;
          total += leadCount; // Add the lead count to the total
        }
        // repObj.total = `<strong>${total}</strong>`;
        repObj.total = total;
        repArr.push(repObj);
      }
    }

    resolve({
      zonesWithCentersGrouped,
      listOfSchools,
      repArr,
      noOfDays: zonesWithCentersGrouped.length ? numDays : 0
    });
  });
};

exports.mtdLeadsReports = async (req, res, next) => {
  try {
    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // Admin
      console.log('Admin');
      const zonesWithCentersGrouped = await Center.getZonesWithCentersGrouped();
      const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
      const countriesPromise = Country.find({ status: "Active" });
      const zonesPromise = Zone.find({ status: "active" });
      const centersPromise = Center.find({ status: "active" })
      const [countries, zones, centers] = await Promise.all([countriesPromise, zonesPromise, centersPromise]);
      res.render('admin/mtd-reports', {
        title: "MTD Reports",
        tblHeaders: zonesWithCentersGrouped,
        listOfSchools,
        countries,
        zones,
        centers
      });
    } else {
      // Non-Admin
      console.log('NON Admin');
      let centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
      const zonesWithCentersGroupedNonAdmin = await Center.getZonesWithCentersGroupedNonAdmin(centersObj, null, null);
      const listOfSchools = _.flatMap(zonesWithCentersGroupedNonAdmin, 'schools').map(school => school.school_display_name);

      let datas = await ViewOption.findOne({
        _id: req.session.user.view_option,
      })
        .populate({
          path: 'countries'
        })
        .populate({
          path: 'zones'
        })
        .populate({
          path: 'centers'
        });

      res.render('admin/mtd-reports-non-admin', {
        title: "MTD Reports",
        tblHeaders: zonesWithCentersGroupedNonAdmin,
        listOfSchools,
        countries: datas.countries,
        zones: datas.zones,
        centers: datas.centers
      });
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.mtdDatatableLeadsReports = async (req, res, next) => {
  try {
    let countries = [];
    let zones = [];
    let centers = [];
    let start = null;
    let end = null;

    if (req.query.country) { // country
      countries = req.query.country.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.zone) { // zone
      zones = req.query.zone.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.center) { // center
      centers = req.query.center.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.dates) { // date
      start = req.query.dates.split("-")[0].trim();
      end = req.query.dates.split("-")[1].trim();
    }

    let startVal = parseInt(req.query.iDisplayStart);
    let lengthVal = parseInt(req.query.iDisplayLength);
    let page = (startVal / lengthVal) + 1;

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // Admin
      processReportsMTD(page || 1, lengthVal || 10, countries, zones, centers, start, end)
        .then(results => {
          let dtObj = {
            iTotalRecords: results.noOfDays,
            iTotalDisplayRecords: results.noOfDays,
            data: _.map(results.repArr, obj => _.values(obj)),
          };
          res.status(200).json(dtObj);
          delete results.zonesWithCentersGrouped;
          delete results.listOfSchools;
          delete results.repArr;
          delete results.noOfDays;
        })
        .catch(err => {
          // Handle any errors that occurred during processing
          helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
          next(err);
          return;
        });
    } else {
      // Non-admin
      let centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
      processReportsMTDNonAdmin(page || 1, lengthVal || 10, countries, zones, centers && centers.length ? centers : centersObj, start, end)
        .then(results => {
          let dtObj = {
            iTotalRecords: results.noOfDays,
            iTotalDisplayRecords: results.noOfDays,
            data: _.map(results.repArr, obj => _.values(obj)),
          };
          res.status(200).json(dtObj);
          delete results.zonesWithCentersGrouped;
          delete results.listOfSchools;
          delete results.repArr;
          delete results.noOfDays;
        })
        .catch(err => {
          // Handle any errors that occurred during processing
          helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
          next(err);
          return;
        });
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "mtdDatatableLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

const mtdProcessExcelSheetToDownload = (req, countries, zones, centers, start, end) => {
  return new Promise(async (resolve, reject) => {
    const timeZone = momentZone.tz.guess();
    const currentDate = moment().tz("Asia/Kolkata");
    let zonesWithCentersGrouped = [];
    let repArr = [];
    let startMonthDate;
    let endMonthDate;

    if (start || end) {
      startMonthDate = momentZone.tz(`${start}`, "Asia/Kolkata").startOf('day').toDate();
      endMonthDate = momentZone.tz(`${end}`, "Asia/Kolkata").endOf('day').toDate();
    } else {
      // by default date range should be current month
      startMonthDate = currentDate.clone().startOf('month');
      endMonthDate = currentDate.clone().endOf('month');
    }

    // get start date and end date of a month
    const startDate = moment(startMonthDate, 'YYYY/MM/DD')
    const endDate = moment(endMonthDate, 'YYYY/MM/DD');

    // Calculate the number of days between the start and end dates
    const numDays = endDate.diff(startDate, 'days') + 1;

    // Generate an array of dates using Lodash range function
    const dateRange = _.range(numDays).map((index) => moment(startDate).add(index, 'days').format('YYYY-MM-DD'));

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      zonesWithCentersGrouped = await Center.getZonesWithCentersGrouped(countries, zones, centers);
    } else {
      zonesWithCentersGrouped = await Center.getZonesWithCentersGroupedNonAdmin(centers, countries, zones);
    }
    const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
    const listOfSchoolsWithIds = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_id);
    const exSums = {};
    let exTotal = 0;

    for (const date of dateRange) {
      const repObj = {
        date: moment(date).format("DD-MMMM-YYYY")
      };
      let total = 0; // Initialize the total to 0
      for (const [i, center_id] of listOfSchoolsWithIds.entries()) {
        // const leadCount = await Lead.reportCountDefault(date, timeZone, center_id);
        let leadCount = await Lead.find({
          lead_date: {
            $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
            $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
          },
          school_id: center_id
        }, { lead_no: 1 });
        leadCount = leadCount.length;
        repObj[`ex_${i}`] = leadCount;
        total += leadCount; // Add the lead count to the total
        // Update the sum for the current "ex_" key
        exSums[`ex_${i}`] = (exSums[`ex_${i}`] || 0) + leadCount;
      }
      repObj.total = total;
      exTotal += total;
      exSums.total = exTotal;
      repArr.push(repObj);
    }
    const lastTotal = {
      date: "Total",
      ...exSums
    };
    repArr.push(lastTotal);
    resolve({
      zonesWithCentersGrouped,
      listOfSchools,
      repArr,
      noOfDays: numDays
    });
  })
}

// MTD Excel export
exports.mtdLeadsExportoExcel = async (req, res, next) => {
  try {
    const timeZone = momentZone.tz.guess();
    let currentDateTZ = moment.tz(moment(), "Asia/Kolkata");
    let currentDate = currentDateTZ.clone().tz("Asia/Kolkata");
    let countries = [];
    let zones = [];
    let centers = [];
    let centersObj = [];
    let start = null;
    let end = null;

    if (!req.session.user.main) {
      centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
    }

    if (req.query.country) { // country
      countries = JSON.parse(req.query.country).map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.zone) { // zone
      zones = JSON.parse(req.query.zone).map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.center) { // center
      centers = JSON.parse(req.query.center).map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.stardate) { // date
      start = req.query.stardate.trim();
      end = req.query.enddate.trim();
    }

    mtdProcessExcelSheetToDownload(req, countries, zones, centers && centers.length ? centers : centersObj, start, end)
      .then(results => {
        const styles = {
          headerDark: {
            alignment: {
              wrapText: true
            }
          },
          SubheaderDark: {
            font: {
              bold: true
            },
            alignment: {
              wrapText: true
            }
          },
          cellOpts: {
            alignment: {
              wrapText: true,
              vertical: "center",
              horizontal: "center"
            }
          },
          customCell: {
            font: {
              bold: true
            },
            alignment: {
              vertical: "center",
              horizontal: "center"
            }
          }
        };

        const head = _.map(results.zonesWithCentersGrouped, obj => {
          const value = obj.zone_name;
          const style = styles.SubheaderDark;
          return { value, style };
        }); // this is for heading only - ZONE
        head.unshift({ value: "", style: styles.SubheaderDark });

        const heading = [
          head
        ]

        const convertedObject = _.chain(results.listOfSchools).map((school, index) => ({
          [`ex_${index}`]: {
            displayName: school,
            headerStyle: styles.headerDark,
            cellStyle: styles.cellOpts,
            width: 120
          }
        }))
          .reduce(_.merge)
          .value();

        const specification = {
          date: {
            displayName: "Date",
            headerStyle: styles.headerDark,
            cellStyle: styles.cellOpts,
            width: 120
          },
          ...convertedObject,
          total: {
            displayName: "Total",
            headerStyle: styles.headerDark,
            cellStyle: styles.customCell,
            width: 120
          },
        };

        let merges = [];
        let currentColumn = 2;

        _.each(results.zonesWithCentersGrouped, (item) => {
          const startColumn = currentColumn;
          const endColumn = startColumn + item.schools.length - 1;
          merges.push({ start: { row: 1, column: startColumn }, end: { row: 1, column: endColumn } });
          currentColumn = endColumn + 1;
        });
        merges.unshift({ start: { row: 1, column: 1 }, end: { row: 1, column: 1 } });

        // merges = [
        //   { start: { row: 1, column: 1 }, end: { row: 1, column: 1 } },
        //   { start: { row: 1, column: 2 }, end: { row: 1, column: 3 } },
        //   { start: { row: 1, column: 4 }, end: { row: 1, column: 9 } },
        //   { start: { row: 1, column: 10 }, end: { row: 1, column: 10 } },
        //   { start: { row: 1, column: 11 }, end: { row: 1, column: 11 } },
        //   { start: { row: 1, column: 12 }, end: { row: 1, column: 13 } }
        // ];

        // console.log(heading);
        // console.log(merges);

        // console.log(results.repArr);

        const report = excel.buildExport(
          [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
            {
              name: 'Report',
              heading: heading,
              merges: merges,
              specification: specification,
              data: results.repArr
            }
          ]
        );

        res.attachment(`Mtd_leads_report_${currentDate.format("DD-MMMM-YYYY hh:mm")}.xlsx`);
        res.send(report);
        delete results.zonesWithCentersGrouped;
        delete results.listOfSchools;
        delete results.repArr;
        delete results.noOfDays;
      })
      .catch(err => {
        console.log(err);
        // Handle any errors that occurred during processing
        helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
        next(err);
        return;
      });

  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "mtdLeadsExportoExcel not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.mtdLeadsExportoExcell = async (req, res, next) => {

  const styles = {
    headerDark: {
      fill: {
        fgColor: {
          rgb: 'FFFFFFFF'
        }
      },
      font: {
        color: {
          rgb: 'FF000000'
        },
        bold: false,
        underline: false
      }
    }
  };

  const heading = [
    [{ value: 'a1', style: styles.headerDark }, { value: 'b1', style: styles.headerDark }, { value: 'c1', style: styles.headerDark }]
  ];

  const specification = {
    customer_name: { // <- the key should match the actual data key
      displayName: 'Customer', // <- Here you specify the column header
      headerStyle: {}, // <- Header style
      cellStyle: function (value, row) { // <- style renderer function
        // if the status is 1 then color in green else color in red
        // Notice how we use another cell value to style the current one
        return (row.status_id == 1) ? {} : {}; // <- Inline cell style is possible
      },
      width: 120 // <- width in pixels
    },
    random_text: {
      displayName: 'Random',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    random_text_1: {
      displayName: 'Random_1',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    random_text_2: {
      displayName: 'Random 2',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    random_text_3: {
      displayName: 'Random 3',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    random_text_4: {
      displayName: 'Random 4',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    random_text_5: {
      displayName: 'Random 5',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    status_id: {
      displayName: 'Status',
      headerStyle: {},
      cellFormat: function (value, row) { // <- Renderer function, you can access also any row.property
        return (value == 1) ? 'Active' : 'Inactive';
      },
      width: '10' // <- width in chars (when the number is passed as string)
    },
    note: {
      displayName: 'Description',
      headerStyle: {},
      cellStyle: {}, // <- Cell style
      width: 220 // <- width in pixels
    }
  }

  const dataset = [
    { customer_name: 'IBM', random_text: 1, random_text_1: 1, random_text_2: 1, random_text_3: 1, random_text_4: 1, random_text_5: 1, status_id: 1, note: 'some note', misc: 'not shown' },
    { customer_name: 'HP', random_text: 1, random_text_1: 1, random_text_2: 1, random_text_3: 1, random_text_4: 1, random_text_5: 1, status_id: 0, note: 'some note' },
    { customer_name: 'MS', random_text: 1, random_text_1: 1, random_text_2: 1, random_text_3: 1, random_text_4: 1, random_text_5: 1, status_id: 0, note: 'some note', misc: 'not shown' }
  ]

  const merges = [
    { start: { row: 1, column: 1 }, end: { row: 1, column: 3 } },
    { start: { row: 2, column: 4 }, end: { row: 2, column: 5 } },
    { start: { row: 2, column: 6 }, end: { row: 2, column: 10 } }
  ]

  const report = excel.buildExport(
    [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
      {
        name: 'Report_demo', // <- Specify sheet name (optional)
        heading: heading, // <- Raw heading array (optional)
        merges: merges, // <- Merge cell ranges
        specification: specification, // <- Report specification
        headerStyle: styles.headerDark,
        data: dataset // <-- Report data
      }
    ]
  );

  // You can then return this straight
  res.attachment('report_demo.xlsx'); // This is sails.js specific (in general you need to set headers)
  return res.send(report);
};


// YTD reports starts from below

exports.ytdLeadsReports = async (req, res, next) => {
  try {
    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // Admin
      console.log('Admin');
      const zonesWithCentersGrouped = await Center.getZonesWithCentersGrouped();
      const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
      const countriesPromise = Country.find({ status: "Active" });
      const zonesPromise = Zone.find({ status: "active" });
      const centersPromise = Center.find({ status: "active" })
      const [countries, zones, centers] = await Promise.all([countriesPromise, zonesPromise, centersPromise]);
      res.render('admin/ytd-reports', {
        title: "YTD Reports",
        tblHeaders: zonesWithCentersGrouped,
        listOfSchools,
        countries,
        zones,
        centers
      });
    } else {
      // Non-Admin
      console.log('NON Admin');
      let centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
      const zonesWithCentersGroupedNonAdmin = await Center.getZonesWithCentersGroupedNonAdmin(centersObj, null, null);
      const listOfSchools = _.flatMap(zonesWithCentersGroupedNonAdmin, 'schools').map(school => school.school_display_name);

      let datas = await ViewOption.findOne({
        _id: req.session.user.view_option,
      })
        .populate({
          path: 'countries'
        })
        .populate({
          path: 'zones'
        })
        .populate({
          path: 'centers'
        });

      res.render('admin/ytd-reports-non-admin', {
        title: "ytd Reports",
        tblHeaders: zonesWithCentersGroupedNonAdmin,
        listOfSchools,
        countries: datas.countries,
        zones: datas.zones,
        centers: datas.centers
      });
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "ytdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

const processReportsYTD = async (res, currPage, length, countries, zones, centers, start, end) => {
  return new Promise(async (resolve, reject) => {
    const timeZone = momentZone.tz.guess();
    const repArr = [];
    const months = [];
    const resultsPerPage = length;
    const currentPage = currPage;

    let startDate;
    let endDate;
    let currentMonth;

    if (start && end) {
      startDate = moment(start, 'MM/YYYY');
      endDate = moment(end, 'MM/YYYY');
      currentMonth = startDate.clone();
    } else {
      res.status(200).json({});
    }

    // const numDays = endM.diff(startM, 'months') + 1;
    // console.log(numDays, "----------------numDays");
    while (currentMonth.isSameOrBefore(endDate, 'month')) {
      months.push(currentMonth.format('MM/YYYY'));
      currentMonth.add(1, 'month');
    }
    // Divide the dateRange into smaller chunks
    const paginatedDates = _.chunk(months, resultsPerPage);

    // Retrieve the dates for the current page
    const currentPageDates = paginatedDates[currentPage - 1];

    // console.log(currentPageDates);

    const zonesWithCentersGrouped = await Center.getZonesWithCentersGrouped(countries, zones, centers);
    const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
    const listOfSchoolsWithIds = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_id);

    if (zonesWithCentersGrouped && zonesWithCentersGrouped.length) {
      for (const date of currentPageDates) {
        const dateParse = moment(date, 'MM/YYYY');
        const dateParseLast = moment(date, 'MM/YYYY');
        const lastDate = dateParseLast.endOf('month');
        // Format the dates as desired
        const firstDateFormatted = dateParse.date(1).format('YYYY-MM-DD');
        const lastDateFormatted = lastDate.format('YYYY-MM-DD');

        const repObj = {
          date: `${dateParse.format('MMMM')}-${dateParse.format('YYYY')}`
        };
        let total = 0; // Initialize the total to 0
        for (const [i, center_id] of listOfSchoolsWithIds.entries()) {
          // const leadCount = await Lead.reportCountDefault(date, timeZone, center_id);
          let leadCount = await Lead.find({
            lead_date: {
              $gte: momentZone.tz(firstDateFormatted, "Asia/Kolkata").startOf('day').toDate(),
              $lte: momentZone.tz(lastDateFormatted, "Asia/Kolkata").endOf('day').toDate()
            },
            school_id: center_id
          }, { lead_no: 1 });
          leadCount = leadCount.length;
          repObj[`rep_${i}`] = leadCount;
          total += leadCount; // Add the lead count to the total
        }
        // repObj.total = `<strong>${total}</strong>`;
        repObj.total = total;
        repArr.push(repObj);
      }
    }

    resolve({
      zonesWithCentersGrouped,
      listOfSchools,
      repArr,
      noOfDays: zonesWithCentersGrouped.length ? months.length : 0
    });
  });
};

const processReportsYTDNonAdmin = async (currPage, length, countries, zones, centers, start, end) => {
  return new Promise(async (resolve, reject) => {
    const timeZone = momentZone.tz.guess();
    const repArr = [];
    const months = [];
    const resultsPerPage = length;
    const currentPage = currPage;

    let startDate;
    let endDate;
    let currentMonth;

    if (start && end) {
      startDate = moment(start, 'MM/YYYY');
      endDate = moment(end, 'MM/YYYY');
      currentMonth = startDate.clone();
    } else {
      res.status(200).json({});
    }

    // const numDays = endM.diff(startM, 'months') + 1;
    // console.log(numDays, "----------------numDays");
    while (currentMonth.isSameOrBefore(endDate, 'month')) {
      months.push(currentMonth.format('MM/YYYY'));
      currentMonth.add(1, 'month');
    }
    // Divide the dateRange into smaller chunks
    const paginatedDates = _.chunk(months, resultsPerPage);

    // Retrieve the dates for the current page
    const currentPageDates = paginatedDates[currentPage - 1];

    // console.log(currentPageDates);

    const zonesWithCentersGrouped = await Center.getZonesWithCentersGroupedNonAdmin(centers, countries, zones);
    const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
    const listOfSchoolsWithIds = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_id);

    if (zonesWithCentersGrouped && zonesWithCentersGrouped.length) {
      for (const date of currentPageDates) {
        const dateParse = moment(date, 'MM/YYYY');
        const dateParseLast = moment(date, 'MM/YYYY');
        const lastDate = dateParseLast.endOf('month');
        // Format the dates as desired
        const firstDateFormatted = dateParse.date(1).format('YYYY-MM-DD');
        const lastDateFormatted = lastDate.format('YYYY-MM-DD');

        const repObj = {
          date: `${dateParse.format('MMMM')}-${dateParse.format('YYYY')}`
        };
        let total = 0; // Initialize the total to 0
        for (const [i, center_id] of listOfSchoolsWithIds.entries()) {
          // const leadCount = await Lead.reportCountDefault(date, timeZone, center_id);
          let leadCount = await Lead.find({
            lead_date: {
              $gte: momentZone.tz(firstDateFormatted, "Asia/Kolkata").startOf('day').toDate(),
              $lte: momentZone.tz(lastDateFormatted, "Asia/Kolkata").endOf('day').toDate()
            },
            school_id: center_id
          }, { lead_no: 1 });
          leadCount = leadCount.length;
          repObj[`rep_${i}`] = leadCount;
          total += leadCount; // Add the lead count to the total
        }
        repObj.total = total;
        repArr.push(repObj);
      }
    }

    resolve({
      zonesWithCentersGrouped,
      listOfSchools,
      repArr,
      noOfDays: zonesWithCentersGrouped.length ? months.length : 0
    });
  });
}

exports.ytdDatatableLeadsReports = async (req, res, next) => {
  try {
    let countries = [];
    let zones = [];
    let centers = [];
    let start = null;
    let end = null;

    if (req.query.country) { // country
      countries = req.query.country.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.zone) { // zone
      zones = req.query.zone.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.center) { // center
      centers = req.query.center.map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.startDate) { // date
      start = req.query.startDate.trim();
      end = req.query.endDate.trim();
    }

    let startVal = parseInt(req.query.iDisplayStart);
    let lengthVal = parseInt(req.query.iDisplayLength);
    let page = (startVal / lengthVal) + 1;

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // Admin
      processReportsYTD(res, page || 1, lengthVal || 10, countries, zones, centers, start, end)
        .then(results => {
          let dtObj = {
            iTotalRecords: results.noOfDays,
            iTotalDisplayRecords: results.noOfDays,
            data: _.map(results.repArr, obj => _.values(obj)),
          };
          res.status(200).json(dtObj);
          delete results.zonesWithCentersGrouped;
          delete results.listOfSchools;
          delete results.repArr;
          delete results.noOfDays;
        })
        .catch(err => {
          // Handle any errors that occurred during processing
          helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
          next(err);
          return;
        });
    } else {
      // Non-admin
      let centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
      processReportsYTDNonAdmin(page || 1, lengthVal || 10, countries, zones, centers && centers.length ? centers : centersObj, start, end)
        .then(results => {
          let dtObj = {
            iTotalRecords: results.noOfDays,
            iTotalDisplayRecords: results.noOfDays,
            data: _.map(results.repArr, obj => _.values(obj)),
          };
          res.status(200).json(dtObj);
          delete results.zonesWithCentersGrouped;
          delete results.listOfSchools;
          delete results.repArr;
          delete results.noOfDays;
        })
        .catch(err => {
          // Handle any errors that occurred during processing
          helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
          next(err);
          return;
        });
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "mtdDatatableLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

const ytdProcessExcelSheetToDownload = (req, countries, zones, centers, start, end) => {
  return new Promise(async (resolve, reject) => {
    const timeZone = momentZone.tz.guess();
    const currentDate = moment().tz("Asia/Kolkata");
    let zonesWithCentersGrouped = [];
    let repArr = [];
    const months = [];

    let startDate;
    let endDate;
    let currentMonth;

    if (start && end) {
      startDate = moment(start, 'MM/YYYY');
      endDate = moment(end, 'MM/YYYY');
      currentMonth = startDate.clone();
    } else {
      res.stays(200).json({});
    }

    while (currentMonth.isSameOrBefore(endDate, 'month')) {
      months.push(currentMonth.format('MM/YYYY'));
      currentMonth.add(1, 'month');
    }

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      zonesWithCentersGrouped = await Center.getZonesWithCentersGrouped(countries, zones, centers);
    } else {
      zonesWithCentersGrouped = await Center.getZonesWithCentersGroupedNonAdmin(centers, countries, zones);
    }
    const listOfSchools = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_display_name);
    const listOfSchoolsWithIds = _.flatMap(zonesWithCentersGrouped, 'schools').map(school => school.school_id);
    const exSums = {};
    let exTotal = 0;

    for (const date of months) {
      const dateParse = moment(date, 'MM/YYYY');
      const dateParseLast = moment(date, 'MM/YYYY');
      const lastDate = dateParseLast.endOf('month');
      // Format the dates as desired
      const firstDateFormatted = dateParse.date(1).format('YYYY-MM-DD');
      const lastDateFormatted = lastDate.format('YYYY-MM-DD');

      const repObj = {
        date: `${dateParse.format('MMMM')}-${dateParse.format('YYYY')}`
      };
      let total = 0; // Initialize the total to 0
      for (const [i, center_id] of listOfSchoolsWithIds.entries()) {
        // const leadCount = await Lead.reportCountDefault(date, timeZone, center_id);
        let leadCount = await Lead.find({
          lead_date: {
            $gte: momentZone.tz(firstDateFormatted, "Asia/Kolkata").startOf('day').toDate(),
            $lte: momentZone.tz(lastDateFormatted, "Asia/Kolkata").endOf('day').toDate()
          },
          school_id: center_id
        }, { lead_no: 1 });
        leadCount = leadCount.length;
        repObj[`ex_${i}`] = leadCount;
        total += leadCount; // Add the lead count to the total
        // Update the sum for the current "ex_" key
        exSums[`ex_${i}`] = (exSums[`ex_${i}`] || 0) + leadCount;
      }
      repObj.total = total;
      exTotal += total;
      exSums.total = exTotal;
      repArr.push(repObj);
    }
    const lastTotal = {
      date: "Total",
      ...exSums
    };
    repArr.push(lastTotal);
    resolve({
      zonesWithCentersGrouped,
      listOfSchools,
      repArr,
      noOfDays: months.length
    });
  })
}

exports.ytdLeadsExportoExcel = async (req, res, next) => {
  try {
    const timeZone = momentZone.tz.guess();
    var currentDateTZ = moment.tz(moment(), "Asia/Kolkata");
    var currentDate = currentDateTZ.clone().tz("Asia/Kolkata");
    let countries = [];
    let zones = [];
    let centers = [];
    let centersObj = [];
    let start = null;
    let end = null;

    if (!req.session.user.main) {
      centersObj = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
    }

    if (req.query.country) { // country
      countries = JSON.parse(req.query.country).map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.zone) { // zone
      zones = JSON.parse(req.query.zone).map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.center) { // center
      centers = JSON.parse(req.query.center).map(s => mongoose.Types.ObjectId(s));
    }

    if (req.query.stardate) { // date
      start = req.query.stardate.trim();
      end = req.query.enddate.trim();
    }

    ytdProcessExcelSheetToDownload(req, countries, zones, centers && centers.length ? centers : centersObj, start, end)
      .then(results => {
        const styles = {
          headerDark: {
            alignment: {
              wrapText: true
            }
          },
          SubheaderDark: {
            font: {
              bold: true
            },
            alignment: {
              wrapText: true
            }
          },
          cellOpts: {
            alignment: {
              wrapText: true,
              vertical: "center",
              horizontal: "center"
            }
          },
          customCell: {
            font: {
              bold: true
            },
            alignment: {
              vertical: "center",
              horizontal: "center"
            }
          }
        };

        const head = _.map(results.zonesWithCentersGrouped, obj => {
          const value = obj.zone_name;
          const style = styles.SubheaderDark;
          return { value, style };
        }); // this is for heading only - ZONE
        head.unshift({ value: "", style: styles.SubheaderDark });

        const heading = [
          head
        ]

        const convertedObject = _.chain(results.listOfSchools).map((school, index) => ({
          [`ex_${index}`]: {
            displayName: school,
            headerStyle: styles.headerDark,
            cellStyle: styles.cellOpts,
            width: 120
          }
        }))
          .reduce(_.merge)
          .value();

        const specification = {
          date: {
            displayName: "Month",
            headerStyle: styles.headerDark,
            cellStyle: styles.cellOpts,
            width: 120
          },
          ...convertedObject,
          total: {
            displayName: "Total",
            headerStyle: styles.headerDark,
            cellStyle: styles.customCell,
            width: 120
          },
        };

        let merges = [];
        let currentColumn = 2;

        _.each(results.zonesWithCentersGrouped, (item) => {
          const startColumn = currentColumn;
          const endColumn = startColumn + item.schools.length - 1;
          merges.push({ start: { row: 1, column: startColumn }, end: { row: 1, column: endColumn } });
          currentColumn = endColumn + 1;
        });
        merges.unshift({ start: { row: 1, column: 1 }, end: { row: 1, column: 1 } });

        // merges = [
        //   { start: { row: 1, column: 1 }, end: { row: 1, column: 1 } },
        //   { start: { row: 1, column: 2 }, end: { row: 1, column: 3 } },
        //   { start: { row: 1, column: 4 }, end: { row: 1, column: 9 } },
        //   { start: { row: 1, column: 10 }, end: { row: 1, column: 10 } },
        //   { start: { row: 1, column: 11 }, end: { row: 1, column: 11 } },
        //   { start: { row: 1, column: 12 }, end: { row: 1, column: 13 } }
        // ];

        // console.log(heading);
        // console.log(merges);

        // console.log(results.repArr);

        const report = excel.buildExport(
          [ // <- Notice that this is an array. Pass multiple sheets to create multi sheet report
            {
              name: 'Report',
              heading: heading,
              merges: merges,
              specification: specification,
              data: results.repArr
            }
          ]
        );

        res.attachment(`Ytd_leads_report_${currentDate.format("DD-MMMM-YYYY hh:mm")}.xlsx`);
        res.send(report);
        delete results.zonesWithCentersGrouped;
        delete results.listOfSchools;
        delete results.repArr;
        delete results.noOfDays;
      })
      .catch(err => {
        console.log(err);
        // Handle any errors that occurred during processing
        helper.errorDetailsForControllers(err, "mtdLeadsReports not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
        next(err);
        return;
      });

  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "mtdLeadsExportoExcel not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.exportDemoTemplate = async (req, res ,next) => {
  try {
    const templateSpec = {
      center_display_name: {
        displayName: "center_display_name",
        headerStyle: {},
        width: 120
      },
      lead_name: {
        displayName: "lead_name",
        headerStyle: {},
        width: 120
      },
      contact_one: {
        displayName: "contact_1",
        headerStyle: {},
        width: 100
      },
      email: {
        displayName: "email",
        headerStyle: {},
        width: 150
      },
      program_cat: {
        displayName: "program_cat",
        headerStyle: {},
        width: 150
      },
      program: {
        displayName: "program",
        headerStyle: {},
        width: 150
      }
    }
    const tempDataset = [];
    tempDataset.push({
      center_display_name: "Kharadi ITPP",
      lead_name: "Example Name",
      contact_one: "9874563210",
      email: "test.kido@gmail.com",
      program_cat: "PRESCHOOL",
      program: "Experimenters"
    });

    const report = excel.buildExport([{
        name: 'leads',
        merges: [],
        specification: templateSpec,
        data: tempDataset
      }
    ]);
    res.attachment(`leads_import.xlsx`);
    return res.send(report);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "exportDemoTemplate not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

const getDefaultDate = () => {
  let currMonth = moment().format("M");
  let startDate = moment().month("Apr").startOf('month').format("MM/DD/YYYY");;
  let endDate = moment().add(1, 'year').month("Mar").endOf('month').format("MM/DD/YYYY");
  if (currMonth == 1 || currMonth == 2 || currMonth == 3) {
    startDate = moment().subtract(1, 'year').month("Apr").startOf('month').format("MM/DD/YYYY");
    endDate = moment().month("Mar").endOf('month').format("MM/DD/YYYY");
  }
  return {
    startDate,
    endDate
  }
};

exports.getCircleChart1Of1 = async (req, res, next) => {
  try {
    let showThis;
    let percentages;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$group': {
          '_id': null,
          'total': {
            '$sum': 1
          },
          'types': {
            '$push': '$source_category'
          }
        }
      }, {
        '$unwind': {
          'path': '$types'
        }
      }, {
        '$group': {
          '_id': '$types',
          'count': {
            '$sum': 1
          },
          'total': {
            '$first': '$total'
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'type': '$_id',
          'count': 1,
          'chart': "circle_1_1",
          'percentage': {
            '$multiply': [
              {
                '$divide': [
                  '$count', '$total'
                ]
              }, 100
            ]
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    percentages = await Lead.aggregate(aggregateQue);
    showThis = _.filter(percentages, { type: 'digital-lead' });

    if (showThis.length) {
      return res.send(showThis);
    } else {
      showThis = [{
        count: 0,
        type: "digital-lead",
        chart: "circle_1_1",
        percentage: 0
      }];
      return res.send(showThis);
    }
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getCircleChart1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getCircleChart2Of1 = async (req, res, next) => {
  try {
    let showThis;
    let percentages;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$match' : {
          'stage': 'Post Tour'
        }
      },
      {
        '$group': {
          '_id': null,
          'total': {
            '$sum': 1
          },
          'types': {
            '$push': '$source_category'
          }
        }
      }, {
        '$unwind': {
          'path': '$types'
        }
      }, {
        '$group': {
          '_id': '$types',
          'count': {
            '$sum': 1
          },
          'total': {
            '$first': '$total'
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'type': '$_id',
          'count': 1,
          'chart': "circle_2_1",
          'percentage': {
            '$multiply': [
              {
                '$divide': [
                  '$count', '$total'
                ]
              }, 100
            ]
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard!");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    percentages = await Lead.aggregate(aggregateQue);

    showThis = _.filter(percentages, { type: 'digital-lead' })
    if (showThis.length) {
      return res.send(showThis);
    } else {
      showThis = [{
        count: 0,
        type: "digital-lead",
        chart: "circle_2_1",
        percentage: 0
      }];
      return res.send(showThis);
    }
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getCircleChart2Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getCircleChart3Of1 = async (req, res, next) => {
  try {
    let showThis;
    let percentages;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$match' : {
          'stage': 'Post Tour'
        }
      },
      {
        '$match' : {
          'enrolled': 1
        }
      },
      {
        '$group': {
          '_id': null,
          'total': {
            '$sum': 1
          },
          'types': {
            '$push': '$source_category'
          }
        }
      }, {
        '$unwind': {
          'path': '$types'
        }
      }, {
        '$group': {
          '_id': '$types',
          'count': {
            '$sum': 1
          },
          'total': {
            '$first': '$total'
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'type': '$_id',
          'count': 1,
          'chart': "circle_3_1",
          'percentage': {
            '$multiply': [
              {
                '$divide': [
                  '$count', '$total'
                ]
              }, 100
            ]
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard!!");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    percentages = await Lead.aggregate(aggregateQue);

    showThis = _.filter(percentages, { type: 'digital-lead' });
    if (showThis.length) {
      return res.send(showThis);
    } else {
      showThis = [{
        count: 0,
        type: "digital-lead",
        chart: "circle_3_1",
        percentage: 0
      }];
      return res.send(showThis);
    }
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getCircleChart2Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getBarChart1Of1 = async (req, res, next) => {
  try {
    let DayArr = [];
    let countArr = [];
    let startDate = momentZone.tz(moment().subtract(6, 'day').valueOf(),"Asia/Kolkata").startOf('day').toDate();
    let endDate = momentZone.tz(moment().valueOf(), "Asia/Kolkata").endOf('day').toDate();
    const start = moment(startDate, 'YYYY/MM/DD');
    const end = moment(endDate, 'YYYY/MM/DD');
    const numDays = end.diff(start, 'days') + 1;
    const dateRange = _.range(numDays).map((index) => moment(start).add(index, 'days').format('YYYY-MM-DD'));

    for (const date of dateRange) {
      let leadCount;
      if (req.session.user.main && req.session.user.main == req.config.admin.main) {
        // ADMIN
        leadCount = await Lead.find({
          type: req.query.type,
          lead_date: {
            $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
            $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
          },
        }, { lead_no: 1 });
      } else {
        // NON-ADMIN
        let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
        leadCount = await Lead.find({
          school_id: { $in: centers },
          type: req.query.type,
          lead_date: {
            $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
            $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
          },
        }, { lead_no: 1 });
      }
      leadCount = leadCount.length;
      DayArr.push(moment(date).format('ddd').toUpperCase());
      countArr.push(leadCount);
    }

    let demo = [{
      chart: "bar_1_1",
      day: DayArr,
      count: countArr,
      sum: _.sum(countArr)
    }];
    return res.send(demo);

  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getBarChart1Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getBarChart2Of1 = async (req, res, next) => {
  try {
    let DayArr = [];
    let countArr = [];
    let startDate = momentZone.tz(moment().subtract(6, 'day').valueOf(),"Asia/Kolkata").startOf('day').toDate();
    let endDate = momentZone.tz(moment().valueOf(), "Asia/Kolkata").endOf('day').toDate();
    const start = moment(startDate, 'YYYY/MM/DD');
    const end = moment(endDate, 'YYYY/MM/DD');
    const numDays = end.diff(start, 'days') + 1;
    const dateRange = _.range(numDays).map((index) => moment(start).add(index, 'days').format('YYYY-MM-DD'));

    for (const date of dateRange) {
      let leadCount;
      if (req.session.user.main && req.session.user.main == req.config.admin.main) {
        // ADMIN
        leadCount = await Lead.find({
          type: req.query.type,
          lead_date: {
            $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
            $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
          },
        }, { lead_no: 1 });
      } else {
        // NON-ADMIN
        let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
        leadCount = await Lead.find({
          school_id: { $in: centers },
          type: req.query.type,
          lead_date: {
            $gte: momentZone.tz(date, "Asia/Kolkata").startOf('day').toDate(),
            $lte: momentZone.tz(date, "Asia/Kolkata").endOf('day').toDate()
          },
        }, { lead_no: 1 });
      }
      leadCount = leadCount.length;
      DayArr.push(moment(date).format('ddd').toUpperCase());
      countArr.push(leadCount);
    }

    let demo = [{
      chart: "bar_2_1",
      day: DayArr,
      count: countArr,
      sum: _.sum(countArr)
    }];
    return res.send(demo);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getBarChart2Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getDoughnutChart1Of1 = async (req, res, next) => {
  try {
    let proenrollcount;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$match': {
          'enrolled': 1
        }
      }, {
        '$group': {
          '_id': '$programcategory_id',
          'totalCount': {
            '$sum': 1
          },
          'program_category': {
            '$first': '$program_category'
          }
        }
      }, {
        '$lookup': {
          'from': 'programcategories',
          'localField': '_id',
          'foreignField': '_id',
          'as': 'programCategory'
        }
      }, {
        '$unwind': {
          'path': '$programCategory'
        }
      }, {
        '$project': {
          '_id': 0,
          'programCategory': '$programCategory.title',
          'totalCount': 1
        }
      }, {
        '$group': {
          '_id': null,
          'totalLeads': {
            '$sum': '$totalCount'
          },
          'programCategories': {
            '$push': {
              'programCategory': '$programCategory',
              'totalCount': '$totalCount'
            }
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'totalLeads': 1,
          'programCategoryPercentage': {
            '$map': {
              'input': '$programCategories',
              'as': 'category',
              'in': {
                'programCategory': '$$category.programCategory',
                'programCategoryCount': '$$category.totalCount',
                'programCategoryPercentage': {
                  '$multiply': [
                    {
                      '$divide': [
                        '$$category.totalCount', '$totalLeads'
                      ]
                    }, 100
                  ]
                }
              }
            }
          }
        }
      }, {
        '$sort': {
          'programCategoryPercentage': 1
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard Doughnut 1.");
    } else {
      // NON-ADMIN
      let centersObj = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      let programs = await Center.aggregate([
        {
          $match:{
            status: "active"
          }
        },
        {
          $match:{
            _id:{$in: centersObj}
          }
        },{
          $lookup: {
            from: "programcategories",
            localField: "programcategory_id",
            foreignField: "_id",
            as: "result"
          }
        },{
          $unwind:{
            path:"$result"
          }
        },{
          $project:{
            "program_cat_name" :"$result.title",
            "_id": 0,
            "_id" :"$result._id"
          }
        }
      ]);
      aggregateQue.unshift({
        '$match': {
          'programcategory_id': {"$in": _.map(programs, "_id")}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    proenrollcount = await Lead.aggregate(aggregateQue);

    // console.log(JSON.stringify(proenrollcount));

    const result = proenrollcount && proenrollcount.length ? proenrollcount[0] : {};
    const programCategoryPercentage = result && Object.keys(result).length ? result.programCategoryPercentage : [];

    let demo = [{
      chart: "doughnut_1_1",
      programCat: _.map(programCategoryPercentage, 'programCategory'),
      programCatPercentage: _.map(programCategoryPercentage, 'programCategoryPercentage').map(Math.round)
    }];
    // console.log(demo);
    return res.send(demo);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getDoughnutChart1Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getDoughnutChart2Of1 = async (req, res, next) => {
  try {
    let proenrollcount;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$match': {
          'enrolled': 1
        }
      }, {
        '$group': {
          '_id': '$program_id',
          'totalCount': {
            '$sum': 1
          },
          'program': {
            '$first': '$program'
          }
        }
      }, {
        '$lookup': {
          'from': 'programs',
          'localField': '_id',
          'foreignField': '_id',
          'as': 'programs_new'
        }
      }, {
        '$unwind': {
          'path': '$programs_new'
        }
      }, {
        '$project': {
          '_id': 0,
          'programs_new': '$programs_new.program_name',
          'totalCount': 1
        }
      }, {
        '$group': {
          '_id': null,
          'totalLeads': {
            '$sum': '$totalCount'
          },
          'programs': {
            '$push': {
              'programs_new': '$programs_new',
              'totalCount': '$totalCount'
            }
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'totalLeads': 1,
          'programPercentage': {
            '$map': {
              'input': '$programs',
              'as': 'category',
              'in': {
                'programName': '$$category.programs_new',
                'programCount': '$$category.totalCount',
                'programPercentage': {
                  '$multiply': [
                    {
                      '$divide': [
                        '$$category.totalCount', '$totalLeads'
                      ]
                    }, 100
                  ]
                }
              }
            }
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard doughnut 2..");
    } else {
      // NON-ADMIN
      let centersObj = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      let programs = await Center.aggregate([
        {
          $match:{
            status: "active"
          }
        },
        {
          $match:{
            _id:{$in: centersObj}
          }
        },{
          $lookup: {
            from: "programs",
            localField: "program_id",
            foreignField: "_id",
            as: "result"
          }
        },{
          $unwind:{
            path:"$result"
          }
        },{
          $project:{
            "program_name" :"$result.program_name",
            "_id": 0,
            "_id" :"$result._id"
          }
        }
      ]);
      aggregateQue.unshift({
        '$match': {
          'programcategory_id': {"$in": _.map(programs, "_id")}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    proenrollcount = await Lead.aggregate(aggregateQue);

    const result = proenrollcount && proenrollcount.length ? proenrollcount[0] : {};
    const programPercentage = result && Object.keys(result).length ? result.programPercentage : [];

    let demo = [{
      chart: "doughnut_2_1",
      program: _.map(programPercentage, 'programName'),
      programPercentage: _.map(programPercentage, 'programPercentage').map(Math.round)
    }];
    // console.log(demo);
    return res.send(demo);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getDoughnutChart2Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getCircleChart1Of2 = async (req, res, next) => {
  try {
    let showThis;
    let percentages;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$group': {
          '_id': null,
          'total': {
            '$sum': 1
          },
          'types': {
            '$push': '$source_category'
          }
        }
      }, {
        '$unwind': {
          'path': '$types'
        }
      }, {
        '$group': {
          '_id': '$types',
          'count': {
            '$sum': 1
          },
          'total': {
            '$first': '$total'
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'type': '$_id',
          'count': 1,
          'chart': "circle_1_2",
          'percentage': {
            '$multiply': [
              {
                '$divide': [
                  '$count', '$total'
                ]
              }, 100
            ]
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard !!!!")
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    percentages = await Lead.aggregate(aggregateQue);

    showThis = _.filter(percentages, { type: 'direct-walk-in' });
    if (showThis.length) {
      return res.send(showThis);
    } else {
      showThis = [{
        count: 0,
        type: "direct-walk-in",
        chart: "circle_1_2",
        percentage: 0
      }];
      return res.send(showThis);
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "getCircleChart1Of2 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getCircleChart2Of2 = async (req, res, next) => {
  try {
    let showThis;
    let percentages;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$match' : {
          'stage': 'Post Tour'
        }
      },
      {
        '$match' : {
          'enrolled': 1
        }
      },
      {
        '$group': {
          '_id': null,
          'total': {
            '$sum': 1
          },
          'types': {
            '$push': '$source_category'
          }
        }
      }, {
        '$unwind': {
          'path': '$types'
        }
      }, {
        '$group': {
          '_id': '$types',
          'count': {
            '$sum': 1
          },
          'total': {
            '$first': '$total'
          }
        }
      }, {
        '$project': {
          '_id': 0,
          'type': '$_id',
          'count': 1,
          'chart': "circle_2_2",
          'percentage': {
            '$multiply': [
              {
                '$divide': [
                  '$count', '$total'
                ]
              }, 100
            ]
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard !!!!!");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    percentages = await Lead.aggregate(aggregateQue);

    showThis = _.filter(percentages, { type: 'direct-walk-in' });
    if (showThis.length) {
      return res.send(showThis);
    } else {
      showThis = [{
        count: 0,
        type: "direct-walk-in",
        chart: "circle_2_2",
        percentage: 0
      }];
      return res.send(showThis);
    }
  } catch (err) {
    helper.errorDetailsForControllers(err, "getCircleChart2Of2 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getHorizontalChart1 = async (req, res, next) => {
  try {
    let showThis;
    let sourceArray;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }
    var finalSourceArray = ["KIDO Website","Facebook","Instagram","Google Ad","Google Map/Google Local","Justdial","Newspaper Ad","Leaflets","Banners","Hoardings","Bus Shelter Displays","Database Tele-calling","School Events","Referral - Alumni Parent","Referral - Existing Parent","Referral - Friends/Relatives","Staff Reference","Other Website","Magazines","Emailer","Society Event","Referral - KIDO employee"];
    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$unwind': {
          'path': '$parent_know_aboutus'
        }
      }, {
          '$group': {
            '_id': '$parent_know_aboutus',
            'count': {
              '$sum': 1
            }
          }
      }, {
          '$project': {
            '_id': 0,
            'source': '$_id',
            'count': 1
          }
      }, {
          '$sort': {
            'count': -1
          }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard horizontal chart 1.");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    sourceArray = await Lead.aggregate(aggregateQue);

    var sourceAccordingToCount = _.map(finalSourceArray, sourceName => {
      const sourceEntry = _.find(sourceArray, { source: sourceName });
      return {
        source: sourceName,
        count: sourceEntry ? sourceEntry.count : 0
      };
    });

    var sortedSource = _.orderBy(sourceAccordingToCount, ['count'], ['desc']);

    if (sourceArray.length) {
      showThis = [{
        chart: "horizontal_1",
        sourceNames: _.map(sortedSource, 'source'),
        sourceCount: _.map(sortedSource, 'count')
      }]
    } else {
      showThis = [{
        chart: "horizontal_1",
        sourceNames: [],
        sourceCount: []
      }];
    }
    return res.send(showThis);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getDoughnutChart2Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getHorizontalChart2 = async (req, res, next) => {
  try {
    let showThis;
    let statusArray;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }
    var finalStatusArray = ["New Lead","To call back/followup","Booked a tour","Not Interested / Need Mismatch","Lost to competitor","Walked-in","Walked in - Need to follow up","Walked in, will not enroll","Walked in - Lost to Competitor","Enrolled"];

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': new Date(getDate.startDate),
            '$lte': new Date(getDate.endDate)
          }
        }
      },
      {
        '$group': {
          '_id': '$status_id',
          'count': {
            '$sum': 1
          }
        }
      }, {
        '$lookup': {
          'from': 'statuses',
          'localField': '_id',
          'foreignField': '_id',
          'as': 'status'
        }
      }, {
        '$project': {
          '_id': 0,
          'count': 1,
          'status': {
            '$arrayElemAt': [
              '$status.name', 0
            ]
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard horizontal chart 2.");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    statusArray = await Lead.aggregate(aggregateQue);

    var statusAccordingToCount = _.map(finalStatusArray, statusName => {
      const statusEntry = _.find(statusArray, { status: statusName });
      return {
        status: statusName,
        count: statusEntry ? statusEntry.count : 0
      };
    });
    // console.log('status count');
    // console.log(statusAccordingToCount);
    if (statusArray.length) {
      showThis = [{
        chart: "horizontal_2",
        statusNames: _.map(statusAccordingToCount, 'status'),
        statusCount: _.map(statusAccordingToCount, 'count')
      }]
    } else {
      showThis = [{
        chart: "horizontal_2",
        statusNames: [],
        statusCount: []
      }];
    }
    return res.send(showThis);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getDoughnutChart2Of1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getHorizontalChart3 = async (req, res, next) => {
  try {
    let showThis;
    let stageArray;
    let srcCatForStage;
    let getDate = getDefaultDate();
    if (req.query.startDate && req.query.endDate) {
      getDate = {
        startDate: req.query.startDate,
        endDate: req.query.endDate
      }
    }
    var finalStageArray = ["New Lead","Enquiry Received","Tour Booked","Closed-Lead Lost","Post Tour","Closed-Enquiry Lost","Closed - Won"];

    let aggregateQue = [
      {
        '$match': {
          'lead_date': {
            '$gte': momentZone.tz(`${getDate.startDate}`, "Asia/Kolkata").startOf('day').toDate(),
            '$lte': momentZone.tz(`${getDate.endDate}`, "Asia/Kolkata").endOf('day').toDate()
          }
        }
      },
      {
        '$group': {
          '_id': '$stage',
          'count': {
            '$sum': 1
          }
        }
      }
    ];

    if (req.session.user.main && req.session.user.main == req.config.admin.main) {
      // ADMIN
      console.log("Admin Dashboard horizontal chart 3.");
    } else {
      // NON-ADMIN
      let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
      aggregateQue.unshift({
        '$match': {
          'school_id': {"$in": centers}
        }
      });
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    stageArray = await Lead.aggregate(aggregateQue);

    var stageAccordingToCount = _.map(finalStageArray, stageName => {
      const stageEntry = _.find(stageArray, { _id: stageName });
      return {
        stage: stageName,
        count: stageEntry ? stageEntry.count : 0
      };
    });
    // console.log('stage count');
    // console.log(stageAccordingToCount);
    if (stageArray.length) {
      showThis = [{
        chart: "horizontal_3",
        stages: _.map(stageAccordingToCount, 'stage'),
        stageCount: _.map(stageAccordingToCount, 'count')
      }]
    } else {
      showThis = [{
        chart: "horizontal_3",
        statusNames: [],
        statusCount: []
      }];
    }
    return res.send(showThis);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getHorizontalChart3 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

// exports.getMultipleBarChart11 = async (req, res, next) => {
//   try {
//     let leadCount;
//     let finArr = [];
//     let months = ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];
//     let startYear = moment().format("YYYY");
//     let endYear = moment().format("YYYY");
//     if (req.query.startMonth && req.query.endMonth) {
//       if (req.query.startMonth !== 'undefined' && req.query.startMonth !== 'null' && req.query.startMonth !== '' && req.query.endMonth !== 'undefined' && req.query.endMonth !== 'null' && req.query.endMonth !== '') {
//         // var startRange = moment().month(req.query.startMonth).format("M") - 1;
//         // var endRange = moment().month(req.query.endMonth).format("M");
//         startYear = req.query.startMonth.split("-")[0];
//         endYear = req.query.endMonth.split("-")[0];
//         // Parse the dates using Moment.js
//         var startDate = moment(req.query.startMonth, "YYYY-MM");
//         var endDate = moment(req.query.endMonth, "YYYY-MM");
//         var startRange = startDate.month();
//         var endRange = endDate.diff(startDate, "months") + startRange + 1;
//         months = _.range(parseInt(startRange), parseInt(endRange));
//       }
//     }
//     console.log("From--->", startYear, "---To---", endYear);
//     const stages = ["New Lead", "Enquiry Received", "Tour Booked", "Closed-Lead Lost", "Post Tour", "Closed-Enquiry Lost", "Closed - Won"];
//     const colors = ['#00356A','#BD5319','#5F712D', '#EB0000', '#ebe134', '#372253', '#34ebc6', '#34c6eb', '#808000'];

//     let aggregateQue = [
//       {
//         '$project': {
//           lead_no: 1
//         }
//       }
//     ];

//     // Country Filter
//     if (req.query.country) {
//       if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
//         let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
//         let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
//         aggregateQue.unshift({
//           '$match': {
//             'country_id': { $in: countries }
//           }
//         });
//       }
//     }

//     // Zone filter
//     if (req.query.zone) {
//       if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
//         let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
//         let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
//         aggregateQue.unshift({
//           '$match': {
//             'zone_id': { $in: zones }
//           }
//         });
//       }
//     }

//     // Center filter
//     if (req.query.center) {
//       if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
//         let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
//         let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
//         aggregateQue.unshift({
//           '$match': {
//             'school_id': { $in: centers }
//           }
//         });
//       }
//     }

//     // Source category filter
//     if (req.query.src_cat) {
//       if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
//         aggregateQue.unshift({
//           '$match': {
//             'source_category': req.query.src_cat
//           }
//         });
//       }
//     }

//     console.log("MOnths-------", months);
//     for (let [i, stage] of stages.entries()) {
//       let finObj = {};
//       // console.log("Stage------>", stage);
//       let color = colors[i];
//       // console.log("color------>", color);
//       finObj.label = stage;
//       finObj.backgroundColor = color;
//       finObj.borderColor = color;
//       let stageArr = [];
//       for (let month of months) {
//         // console.log("Month------->", month);
//         let startDate = moment().month(month).startOf('month').format('YYYY-MM-DD');
//         let endDate = moment().month(month).endOf('month').format('YYYY-MM-DD');
//         if (req.session.user.main && req.session.user.main == req.config.admin.main) {
//           // ADMIN
//           aggregateQue.unshift(
//             {
//               '$match': {
//                 'stage': stage
//               }
//             }, {
//               '$match': {
//                 'lead_date': {
//                   $gte: momentZone.tz(startDate, "Asia/Kolkata").startOf('month').toDate(),
//                   $lte: momentZone.tz(endDate, "Asia/Kolkata").endOf('month').toDate()
//                 }
//               }
//             }
//           );
//           leadCount = await Lead.aggregate(aggregateQue);
//           _.remove(aggregateQue, '$match.stage');
//           _.remove(aggregateQue, '$match.lead_date');
//         } else {
//           // NON-ADMIN
//           let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
//           aggregateQue.unshift(
//             {
//               '$match': {
//                 'lead_date': {
//                   $gte: momentZone.tz(startDate, "Asia/Kolkata").startOf('month').toDate(),
//                   $lte: momentZone.tz(endDate, "Asia/Kolkata").endOf('month').toDate()
//                 }
//               }
//             },
//             {
//               '$match': {
//                 'stage': stage
//               }
//             },
//             {
//               '$match': {
//               'school_id': {"$in": centers}
//               }
//             }
//           );
//           leadCount = await Lead.aggregate(aggregateQue);
//           _.remove(aggregateQue, '$match.lead_date');
//           _.remove(aggregateQue, '$match.stage');
//           _.remove(aggregateQue, '$match.school_id');
//         }
//         stageArr.push(leadCount.length);
//       }
//       console.log("in loop--");
//       finObj.data = stageArr;
//       finArr.push(finObj);
//       // console.log("--------------------");
//     }

//     console.log("finArr----->", finArr);
//     let demo = [{
//       chart: "multibar_1",
//       data: finArr,
//       label: _.map(months, function(m) {
//         return moment().month(m).endOf('month').format('MMM');
//       })
//     }];
//     return res.send(demo);
//   } catch (err) {
//     console.log(err);
//     helper.errorDetailsForControllers(err, "getMultipleBarChart1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
//     next(err);
//     return;
//   }
// };

exports.getMultipleBarChart1 = async (req, res, next) => {
  try {
    let startMonth;
    let endMonth;
    const results = [];
    let finArr = [];

    const stages = ["New Lead", "Enquiry Received", "Tour Booked", "Closed-Lead Lost", "Post Tour", "Closed-Enquiry Lost", "Closed - Won"];
    const colors = ['#00356A', '#BD5319', '#808000', '#EB0000', '#ebe134', '#372253', '#34ebc6', '#34c6eb', '#5F712D'];

    let aggregateQue = [
      {
        '$project': {
          lead_no: 1
        }
      }
    ];

    startMonth = moment().month("Apr").format("YYYY-MM");
    endMonth = moment().add(1, 'year').month("Mar").format("YYYY-MM");

    var currMonth = moment().format("M");
    if (currMonth == 1 || currMonth == 2 || currMonth == 3) {
      startMonth = moment().subtract(1, 'year').month("Apr").format("YYYY-MM");
      endMonth = moment().month("Mar").format("YYYY-MM");
    }

    let startDate = moment(startMonth, 'YYYY-MM');
    let endDate = moment(endMonth, 'YYYY-MM');

    // Months filter
    if (req.query.startMonth && req.query.endMonth) {
      if (req.query.startMonth !== 'undefined' && req.query.startMonth !== 'null' && req.query.startMonth !== '' && req.query.endMonth !== 'undefined' && req.query.endMonth !== 'null' && req.query.endMonth !== '') {
        startDate = moment(req.query.startMonth, 'YYYY-MM');
        endDate = moment(req.query.endMonth, 'YYYY-MM');
      }
    }

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    for (let [i, stage] of stages.entries()) {
      let finObj = {};
      let color = colors[i];
      finObj.label = stage;
      finObj.backgroundColor = color;
      finObj.borderColor = color;
      let stageArr = [];
      for (let currentDate = startDate.clone(); currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'month'); currentDate.add(1, 'month')) {
        // console.log("running kya");
        let startOfMonthDate = currentDate.clone().startOf('month').format('YYYY-MM-DD');
        let endOfMonthDate = currentDate.clone().endOf('month').format('YYYY-MM-DD');

        let startDate = momentZone.tz(`${startOfMonthDate}`, "Asia/Kolkata").startOf('day').toDate();
        let endDate = momentZone.tz(`${endOfMonthDate}`, "Asia/Kolkata").endOf('day').toDate();

        if (req.session.user.main && req.session.user.main == req.config.admin.main) {
          // Admin
          aggregateQue.unshift(
            {
              '$match': {
                'stage': stage
              }
            }, {
            '$match': {
              'lead_date': {
                $gte: startDate,
                $lte: endDate
              }
            }
          }
          );
          leadCount = await Lead.aggregate(aggregateQue);
          _.remove(aggregateQue, '$match.stage');
          _.remove(aggregateQue, '$match.lead_date');
        } else {
          // Non-Admin
          let centers = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
          aggregateQue.unshift(
            {
              '$match': {
                'lead_date': {
                  $gte: startDate,
                  $lte: endDate
                }
              }
            },
            {
              '$match': {
                'stage': stage
              }
            },
            {
              '$match': {
                'school_id': { "$in": centers }
              }
            }
          );
          leadCount = await Lead.aggregate(aggregateQue);
          _.remove(aggregateQue, '$match.lead_date');
          _.remove(aggregateQue, '$match.stage');
          _.remove(aggregateQue, '$match.school_id');
        }
        stageArr.push(leadCount.length);
        if (i == 6) {
          results.push(currentDate.format('MMM'));
        }
      }
      finObj.data = stageArr;
      finArr.push(finObj);
    }
    let demo = [{
      chart: "multibar_1",
      data: finArr,
      label: results
    }];
    return res.send(demo);

  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getMultipleBarChart1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getMultipleLineBarChart11 = async (req, res, next) => {
  try {
    const yearCount = 3;
    let startYear = moment().format("YYYY");
    let endYear = moment().format("YYYY");

    let leadCount;
    let finArr = [];
    let months = ["3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13", "14"];
    if (req.query.startMonth && req.query.endMonth) {
      if (req.query.startMonth !== 'undefined' && req.query.startMonth !== 'null' && req.query.startMonth !== '' && req.query.endMonth !== 'undefined' && req.query.endMonth !== 'null' && req.query.endMonth !== '') {
        // var startRange = moment().month(req.query.startMonth).format("M") - 1;
        // var endRange = moment().month(req.query.endMonth).format("M");
        startYear = req.query.startMonth.split("-")[0];
        endYear = req.query.endMonth.split("-")[0];
        var startDate = moment(req.query.startMonth, "YYYY-MM");
        var endDate = moment(req.query.endMonth, "YYYY-MM");
        var startRange = startDate.month();
        var endRange = endDate.diff(startDate, "months") + startRange + 1;
        months = _.range(parseInt(startRange), parseInt(endRange));
      }
    }
    const colors = ['#00356A','#BD5319','#5F712D'];

    let aggregateQue = [
      {
        '$project': {
          lead_no: 1
        }
      }
    ];

    // Country Filter
    if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    // console.log("mutilline bar console----", aggregateQue);
    for (let yearIndex = 0; yearIndex < yearCount; yearIndex++) {
      let finObj = {};
      let color = colors[yearIndex];
      let monthsArr = [];
      let year = moment().subtract(yearIndex, 'year').format('YYYY');
      finObj.label = year;
      finObj.borderColor = color;
      finObj.pointBorderColor = "#FFF";
      finObj.pointBackgroundColor = color;
      finObj.pointBorderWidth = 2;
      finObj.pointHoverRadius = 4;
      finObj.pointHoverBorderWidth = 1;
      finObj.pointRadius = 4;
      finObj.backgroundColor = 'transparent';
      finObj.fill = true;
      finObj.borderWidth = 2;
      // console.log("Which Year ------->", year);;
      for (let month of months) {
        let startDate = moment(year).month(month).startOf('month').format('YYYY-MM-DD');
        let endDate = moment(year).month(month).endOf('month').format('YYYY-MM-DD');
        // console.log("From--", startDate, "---to---", endDate);
        if (req.session.user.main && req.session.user.main == req.config.admin.main) {
          // ADMIN
          aggregateQue.unshift({
            '$match': {
              'lead_date': {
                $gte: momentZone.tz(startDate, "Asia/Kolkata").startOf('month').toDate(),
                $lte: momentZone.tz(endDate, "Asia/Kolkata").endOf('month').toDate()
              }
            }
          });
          leadCount = await Lead.aggregate(aggregateQue);
          _.remove(aggregateQue, '$match.lead_date');
        } else {
          // NON-ADMIN
          let centers = await Center.find({_id: {$in: req.session.user.center_id}, status: "active"}).distinct('_id');
          aggregateQue.unshift(
            {
              '$match': {
                'lead_date': {
                  $gte: momentZone.tz(startDate, "Asia/Kolkata").startOf('month').toDate(),
                  $lte: momentZone.tz(endDate, "Asia/Kolkata").endOf('month').toDate()
                }
              }
            },
            {
              '$match': {
              'school_id': {"$in": centers}
              }
            }
          );
          leadCount = await Lead.aggregate(aggregateQue);
          _.remove(aggregateQue, '$match.lead_date');
          _.remove(aggregateQue, '$match.school_id');
        }
        monthsArr.push(leadCount.length);
      }
      // console.log("in loopp------");
      finObj.data = monthsArr;
      finArr.push(finObj);
    }
    let demo = [{
      chart: "multilinebar_1",
      data: finArr,
      label: _.map(months, function(m) {
        return moment().month(m).endOf('month').format('MMM');
      })
    }];
    return res.send(demo);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getMultipleLineBarChart1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};

exports.getMultipleLineBarChart1 = async (req, res, next) => {
  try {
    let results = [];
    let leadCount;
    let finArr = [];
    const colors = ['#00356A', '#BD5319', '#5F712D'];

    let yearsArr = [];
    let startMonth;
    let endMonth;

    startMonth = moment().month("Apr").format("YYYY-MM");
    endMonth = moment().add(1, 'year').month("Mar").format("YYYY-MM");

    var currMonth = moment().format("M");
    if (currMonth == 1 || currMonth == 2 || currMonth == 3) {
      startMonth = moment().subtract(1, 'year').month("Apr").format("YYYY-MM");
      endMonth = moment().month("Mar").format("YYYY-MM");
    }

    let aggregateQue = [
      {
        '$project': {
          lead_no: 1
        }
      }
    ];

    if (req.query.startMonth && req.query.endMonth) {
      if (req.query.startMonth !== 'undefined' && req.query.startMonth !== 'null' && req.query.startMonth !== '' && req.query.endMonth !== 'undefined' && req.query.endMonth !== 'null' && req.query.endMonth !== '') {
        startMonth = req.query.startMonth;
        endMonth = req.query.endMonth;
      }
    }

    let startMonthSplit = startMonth.split("-")[0];
    let endMonthSplit = endMonth.split("-")[0];

    if (startMonthSplit == endMonthSplit) {
      let sDate = startMonth.split("-")[1];
      let eDate = endMonth.split("-")[1];
      yearsArr = [
        {
          startDateMonth: `${startMonthSplit}-${sDate}`,
          endDateMonth: `${endMonthSplit}-${eDate}`
        }, {
          startDateMonth: `${parseInt(startMonthSplit) - 1}-${sDate}`,
          endDateMonth: `${parseInt(endMonthSplit) - 1}-${eDate}`
        }, {
          startDateMonth: `${parseInt(startMonthSplit) - 2}-${sDate}`,
          endDateMonth: `${parseInt(endMonthSplit) - 2}-${eDate}`
        }
      ]
    } else {
      let sDate = startMonth.split("-")[1];
      let eDate = endMonth.split("-")[1];
      yearsArr = [
        {
          startDateMonth: `${startMonthSplit}-${sDate}`,
          endDateMonth: `${endMonthSplit}-${eDate}`
        }, {
          startDateMonth: `${parseInt(startMonthSplit) - 1}-${sDate}`,
          endDateMonth: `${parseInt(endMonthSplit) - 1}-${eDate}`
        }, {
          startDateMonth: `${parseInt(startMonthSplit) - 2}-${sDate}`,
          endDateMonth: `${parseInt(endMonthSplit) - 2}-${eDate}`
        }
      ]
    }

     // Country Filter
     if (req.query.country) {
      if (req.query.country !== 'undefined' && req.query.country !== 'null' && req.query.country !== '') {
        let countryNames = req.query.country && req.query.country.includes(',') ? req.query.country.split(",") : [req.query.country];
        let countries = countryNames.map(country => mongoose.Types.ObjectId(country));
        aggregateQue.unshift({
          '$match': {
            'country_id': { $in: countries }
          }
        });
      }
    }

    // Zone filter
    if (req.query.zone) {
      if (req.query.zone !== 'undefined' && req.query.zone !== 'null' && req.query.zone !== '') {
        let zoneNames = req.query.zone && req.query.zone.includes(',') ? req.query.zone.split(",") : [req.query.zone];
        let zones = zoneNames.map(zone => mongoose.Types.ObjectId(zone));
        aggregateQue.unshift({
          '$match': {
            'zone_id': { $in: zones }
          }
        });
      }
    }

    // Center filter
    if (req.query.center) {
      if (req.query.center !== 'undefined' && req.query.center !== 'null' && req.query.center !== '') {
        let centerNames = req.query.center && req.query.center.includes(',') ? req.query.center.split(",") : [req.query.center];
        let centers = centerNames.map(center => mongoose.Types.ObjectId(center));
        aggregateQue.unshift({
          '$match': {
            'school_id': { $in: centers }
          }
        });
      }
    }

    // Source category filter
    if (req.query.src_cat) {
      if (req.query.src_cat !== 'undefined' && req.query.src_cat !== 'null' && req.query.src_cat !== '') {
        aggregateQue.unshift({
          '$match': {
            'source_category': req.query.src_cat
          }
        });
      }
    }

    for (let [i, year] of yearsArr.entries()) {
      let monthsArr = [];
      let sDate = year.startDateMonth.split("-")[0];
      let eDate = year.endDateMonth.split("-")[0];
      let finObj = {};
      let color = colors[i];
      finObj.label = (sDate == eDate) ? `${sDate}` : `${sDate}-${eDate}`;
      finObj.borderColor = color;
      finObj.pointBorderColor = "#FFF";
      finObj.pointBackgroundColor = color;
      finObj.pointBorderWidth = 2;
      finObj.pointHoverRadius = 4;
      finObj.pointHoverBorderWidth = 1;
      finObj.pointRadius = 4;
      finObj.backgroundColor = 'transparent';
      finObj.fill = true;
      finObj.borderWidth = 2;

      let startDate = moment(year.startDateMonth, 'YYYY-MM');
      let endDate = moment(year.endDateMonth, 'YYYY-MM');

      for (let currentDate = startDate.clone(); currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'month'); currentDate.add(1, 'month')) {
        let startOfMonthDate = currentDate.clone().startOf('month').format('YYYY-MM-DD');
        let endOfMonthDate = currentDate.clone().endOf('month').format('YYYY-MM-DD');

        let startDate = momentZone.tz(`${startOfMonthDate}`, "Asia/Kolkata").startOf('day').toDate();
        let endDate = momentZone.tz(`${endOfMonthDate}`, "Asia/Kolkata").endOf('day').toDate();
        if (req.session.user.main && req.session.user.main == req.config.admin.main) {
          // Admin
          aggregateQue.unshift({
            '$match': {
              'lead_date': {
                $gte: startDate,
                $lte: endDate
              }
            }
          });
          leadCount = await Lead.aggregate(aggregateQue);
          _.remove(aggregateQue, '$match.lead_date');
        } else {
          // Non-Admin
          let centers = await Center.find({ _id: { $in: req.session.user.center_id }, status: "active" }).distinct('_id');
          aggregateQue.unshift(
            {
              '$match': {
                'lead_date': {
                  $gte: startDate,
                  $lte: endDate
                }
              }
            },
            {
              '$match': {
                'school_id': { "$in": centers }
              }
            }
          );
          leadCount = await Lead.aggregate(aggregateQue);
          _.remove(aggregateQue, '$match.lead_date');
          _.remove(aggregateQue, '$match.school_id');
        }
        monthsArr.push(leadCount.length);
        if (i == 2) {
          results.push(currentDate.format('MMM'));
        }
      }
      finObj.data = monthsArr;
      finArr.push(finObj);
    }
    let demo = [{
      chart: "multilinebar_1",
      data: finArr,
      label: results
    }];
    return res.send(demo);
  } catch (err) {
    console.log(err);
    helper.errorDetailsForControllers(err, "getMultipleLineBarChart1 not working - get request", req.originalUrl, req.body, {}, "redirect", __filename);
    next(err);
    return;
  }
};
