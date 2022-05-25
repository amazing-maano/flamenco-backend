const express = require('express');

const router = express.Router();
const passport = require('passport');

const requireAuth = passport.authenticate('jwt', { session: false });

const { isAuthenticated } = require('../utils/isAuthenticated');

const { isAdmin } = require('../utils/checkRole');

const { generateRoutes } = require('../utils/generateRoutes');
const {
  dashboardOverview, viewAllHosts, viewAllStudentss, addUsers,
  editHostOrStudent, deleteHostOrStudent,
} = require('../controllers/adminController');

const ProductRoutes = [
  {
    method: 'get',
    route: '/admin/dashboard',
    middleware: [requireAuth, isAuthenticated, isAdmin],
    action: dashboardOverview,
  },
  {
    method: 'get',
    route: '/admin/hosts',
    middleware: [requireAuth, isAuthenticated, isAdmin],
    action: viewAllHosts,
  },
  {
    method: 'get',
    route: '/admin/students',
    middleware: [requireAuth, isAuthenticated, isAdmin],
    action: viewAllStudentss,
  },
  {
    method: 'post',
    route: '/admin/add-user',
    middleware: [requireAuth, isAuthenticated, isAdmin],
    action: addUsers,
  },
  {
    method: 'put',
    route: '/admin/edit-user/:userId',
    middleware: [requireAuth, isAuthenticated, isAdmin],
    action: editHostOrStudent,
  },
  {
    method: 'delete',
    route: '/admin/:userId/:productId',
    middleware: [requireAuth, isAuthenticated, isAdmin],
    action: deleteHostOrStudent,
  },
];

generateRoutes(router, ProductRoutes);

module.exports = router;
