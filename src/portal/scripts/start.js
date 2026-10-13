(function () {
  'use strict';
  function initialize() {
    var root = document.querySelector('.consultant-portal');
    if (!root || root.dataset.initialized) return;
    root.dataset.initialized = 'true';
    var preview = root.dataset.preview === 'true';
    var views = portalConfig.views;
    var form = document.getElementById('profile-form');
