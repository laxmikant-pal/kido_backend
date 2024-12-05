const express = require('express');
const router = express.Router();
const leadsController = require('../../../controllers/api/leadsController');
const accountController = require('../../../controllers/api/accountController');
const handlers = require("../../../handlers/helper");
const { permission_name } = require('../../../config/responseSetting');
const Validator = require('../../../middlewares/Validator');

router.get('/all',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllLeads
);

router.get('/all/today/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllTodayLeads
);

router.get('/all/today',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllTodayLeads
);

router.get('/all/yesterday/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllYesterdayLeads
);

router.get('/all/yesterday',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllYesterdayLeads
);
router.get('/all/thisweek/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisWeakLeads
);

router.get('/all/thisweek',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisWeakLeads
);

router.get('/all/thismonth/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisMonthLeads
);

router.get('/all/thismonth',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisMonthLeads
);

router.get('/all/older/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllOlderLeads
);

router.get('/all/older',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllOlderLeads
);

router.get('/all/enquiry/today/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllTodayEnquiry
);

router.get('/all/enquiry/today',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllTodayEnquiry
);

router.get('/all/enquiry/yesterday/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllYesterdayEnquiry
);

router.get('/all/enquiry/yesterday',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllYesterdayEnquiry
);

router.get('/all/enquiry/thisweek/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisWeakEnquiry
);

router.get('/all/enquiry/thisweek',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisWeakEnquiry
);

router.get('/all/enquiry/thismonth/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisMonthEnquiry
);

router.get('/all/enquiry/thismonth',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllThisMonthEnquiry
);

router.get('/all/enquiry/older/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllOlderEnquiry
);

router.get('/all/enquiry/older',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.getAllOlderEnquiry
);

router.get('/details/:lead_id',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.FOLLOWUP_ADD),
  leadsController.getLeadDetails
);

router.get('/saved/list',
  accountController.Auth,
  accountController.checkToken,
  leadsController.getSavedListLead
);

router.get('/enquiry/saved/list',
  accountController.Auth,
  accountController.checkToken,
  leadsController.getSavedListEnq
);

router.post('/add',
  accountController.Auth,
  accountController.checkToken,
  Validator('addLead'),
  handlers.requireAPIPermission(permission_name.LEAD_ADD),
  leadsController.addLeadPost
);

router.get('/edit/:lead_id',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_EDIT),
  leadsController.getEditLeadPost
);

router.post('/edit/:lead_id',
  accountController.Auth,
  accountController.checkToken,
  Validator('editLead'),
  handlers.requireAPIPermission(permission_name.LEAD_EDIT),
  leadsController.postEditLeadPost
);

// know us
router.get('/source',
  accountController.Auth,
  accountController.checkToken,
  leadsController.getAllSource
);

router.get('/statuses',
  accountController.Auth,
  accountController.checkToken,
  leadsController.getAllStatuses
);

router.get('/substatuses',
  accountController.Auth,
  accountController.checkToken,
  leadsController.getAllSubStatuses
);

router.get('/actionplanned',
  accountController.Auth,
  accountController.checkToken,
  leadsController.getAllActionPlanned
);

router.get('/source/category',
  accountController.Auth,
  accountController.checkToken,
  leadsController.dropdownSourceCategory
);

router.get('/stages',
  accountController.Auth,
  accountController.checkToken,
  leadsController.dropdownStages
);

router.post('/filter',
  accountController.Auth,
  accountController.checkToken,
  leadsController.dropdownFilter
);

router.post('/filter/:page',
  accountController.Auth,
  accountController.checkToken,
  leadsController.dropdownFilter
);

router.post('/search/:page',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.searchFilter
);

router.post('/search',
  accountController.Auth,
  accountController.checkToken,
  handlers.requireAPIPermission(permission_name.LEAD_LISTING),
  leadsController.searchFilter
);

router.post('/website/create',
  accountController.Auth,
  accountController.checkToken,
  Validator('addLeadFromWebsite'),
  handlers.requireAPIPermission(permission_name.LEAD_ADD),
  leadsController.addLeadForWebIntegration
);

module.exports = router;