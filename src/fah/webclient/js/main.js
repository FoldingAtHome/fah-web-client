/************************************ Globals *********************************/
var fah = {
  stats_url: 'https://apps.foldingathome.org/stats.py',
  project_url: 'https://apps.foldingathome.org/project-jsonp.py',

  timestamp: new Date().getTime(),
  version: null,
  max_project_brief: 600, // Maximum brief project description length

  disconnected: false,
  failed_updates: 0,
  active_updates: 0,
  connection_timeout: 7000, // ms
  last_update: 0,
  last_stats: 0,
  last_mouse: new Date().valueOf(),
  mouse_inside_timeout: 30 * 60 * 1000,
  mouse_outside_timeout: 10 * 60 * 1000,

  user: null,
  team: null,
  passkey: null,

  slots: {},
  projects: {},
  descriptions: {},

  // Methods
  f_user: null,
  f_passkey: null,
  f_power: null,
  f_pause: null,
  f_idle: null,
  f_team: null,
  f_cause: null,
  f_slot: null,

  status_msg: {
    running: 'All systems go.',
    paused: 'Waiting for the computer to idle.',
    stopping: 'Click Start Folding to continue folding again.',
    download: 'Getting a new Work Unit from Folding@home.',
    upload: 'Work unit completed!  Uploading to Folding@home.',
    ready: 'Ready.',
    finishing: 'Will pause once the current Work Unit is completed.',
    disabled: 'Get help at <a target="_blank" ' +
      'href="https://foldingforum.org/">foldingforum.org</a>.'
  }
};

/********************************* Browser Detect *****************************/
// From http://www.quirksmode.org/js/detect.html
var BrowserDetect = {
  init: function() {
    this.browser = this.searchString(this.dataBrowser)
      || "An unknown browser";

    this.version = this.searchVersion(navigator.userAgent)
      || this.searchVersion(navigator.appVersion)
      || "an unknown version";

    this.OS = this.searchString(this.dataOS) || "an unknown OS";
  },

  searchString: function(data) {
    for (var i = 0; i < data.length; i++) {
      var dataString = data[i].string;
      var dataProp = data[i].prop;

      this.versionSearchString =
        data[i].versionSearch || data[i].identity;

      if (dataString) {
        if (dataString.indexOf(data[i].subString) != -1)
          return data[i].identity;

      } else if (dataProp) return data[i].identity;
    }
  },

  searchVersion: function(dataString) {
    var index = dataString.indexOf(this.versionSearchString);
    if (index == -1) return;

    return parseFloat(dataString.substring
                      (index + this.versionSearchString.length + 1));
  },

  dataBrowser: [ {
    string: navigator.userAgent,
    subString: "Chrome",
    identity: "Chrome"
  }, {
    string: navigator.userAgent,
    subString: "OmniWeb",
    versionSearch: "OmniWeb/",
    identity: "OmniWeb"
  }, {
    string: navigator.vendor,
    subString: "Apple",
    identity: "Safari",
    versionSearch: "Version"
  }, {
    prop: window.opera,
    identity: "Opera",
    versionSearch: "Version"
  }, {
    string: navigator.vendor,
    subString: "iCab",
    identity: "iCab"
  }, {
    string: navigator.vendor,
    subString: "KDE",
    identity: "Konqueror"
  }, {
    string: navigator.userAgent,
    subString: "Firefox",
    identity: "Firefox"
  }, {
    string: navigator.vendor,
    subString: "Camino",
    identity: "Camino"
  }, { // For newer Netscapes (6+)
    string: navigator.userAgent,
    subString: "Netscape",
    identity: "Netscape"
  }, {
    string: navigator.userAgent,
    subString: "MSIE",
    identity: "Explorer",
    versionSearch: "MSIE"
  }, {
    string: navigator.userAgent,
    subString: "Gecko",
    identity: "Mozilla",
    versionSearch: "rv"
  }, { // For older Netscapes (4-)
    string: navigator.userAgent,
    subString: "Mozilla",
    identity: "Netscape",
    versionSearch: "Mozilla"
  } ],

  dataOS: [ {
    string: navigator.platform,
    subString: "Win",
    identity: "Windows"
  }, {
    string: navigator.platform,
    subString: "Mac",
    identity: "Mac"
  }, {
    string: navigator.userAgent,
    subString: "iPhone",
    identity: "iPhone/iPod"
  }, {
    string: navigator.platform,
    subString: "Linux",
    identity: "Linux"
  } ]
};


/******************************* Utility functions ****************************/
// String.trim() is not supported by all browsers
if (typeof String.prototype.trim === 'undefined') {
  String.prototype.trim = function() {
    return String(this).replace(/^\s+|\s+$/g, '');
  };
}


function number_with_commas(x) {
  var parts = x.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}


// Array.indexOf() is not in IE < 9
if (typeof Array.prototype.indexOf == 'undefined') {
  Array.prototype.indexOf = function(elt, from) {
    var len = this.length >>> 0;

    if (typeof from == 'undefined') from = 0;
    else from = Number(from);
    from = from < 0 ? Math.ceil(from) : Math.floor(from);
    if (from < 0) from += len;

    for (; from < len; from++)
      if (from in this && this[from] === elt) return from;

    return -1;
  };
}


function obj_size(obj) {
  var count = 0;
  for (var i in obj)
    if (obj.hasOwnProperty(i)) count++;
  return count;
}


function debug(msg) {
  if (typeof console == 'undefined' || typeof console.log == 'undefined')
    return;

  if (typeof msg !== 'string' && typeof JSON !== 'undefined')
    msg = JSON.stringify(msg);

  console.log('DEBUG: ' + msg);
}


function get_arg(arg, defaultValue) {
  return typeof arg == 'undefined' ? defaultValue : arg;
}


/******************************************************************************/
function unconfigured() {
  $('#unconfigured').dialog({
    modal: true,
    resizable: false,
    width: 700,
    closeOnEscape: false,
    dialogClass: 'no-close',
    open: function(event, ui) {
      $('.ui-dialog-titlebar-close', $(this).parent()).hide();
    }
  });
}


/**************************** Stats functions *********************************/
function check_stats(now) {
  if (now < fah.last_stats + 60 * 15 * 1000 ||
      fah.user == null || fah.team == null || fah.version == null) return;
  fah.last_stats = now;

  $('#box-points').css({'display': 'none'});
  $('#box-points-loading').css({'display': 'block'});

  if (fah.user.toLowerCase() == 'anonymous') {
    $('#box-points-loading').text('Choose a user name to earn points.');
    return;
  }

  $('#box-points-loading').text('Loading...');

  $.ajax({
    url: fah.stats_url,
    type: 'GET',
    data: {'user': fah.user, 'team': fah.team, 'passkey': fah.passkey,
           'version': fah.version},
    cache: false,
    dataType: 'jsonp',
    success: dispatch
  });
}


function update_stats(data) {
  var url = fah.user_stats_url + '/donor/' + fah.user;
  $('#box-points a').attr({href: url});

  $('#box-points-counter').text(number_with_commas(data.earned));
  $('#box-points-counter-contributed')
    .text(number_with_commas(data.contributed));
  $('#box-user-stats-link').attr({href: data.url, target: '_blank'});

  if (fah.team) {
    $('#box-points-counter-team').text(number_with_commas(data.team_total));

    var team_name = data.team_name ? data.team_name : fah.team;
    if (typeof data.team_url != 'undefined')
      team_name = '<a target="_blank" href="' + data.team_url + '">' +
      team_name + '</a>';
    $('#box-points-team').html(team_name);

    $('#team-points').css({'display': 'block'});
    $('#no-team').css({'display': 'none'});

  } else {
    $('#team-points').css({'display': 'none'});
    $('#no-team').css({'display': 'block'});
  }

  $('#box-points-loading').css({'display': 'none'});
  $('#box-points').css({'display': 'block'});
}


/******************************************************************************/
function update_basic(data) {
  if (data.version != fah.version) {
    fah.version = data.version;
    document.title += ' - Version ' + fah.version;
  }

  // Trigger stats reload
  if (fah.f_user != data.user || fah.team != data.team ||
      fah.passkey != data.passkey) fah.last_stats = 0;

  if (fah.f_user != null && fah.user != data.user)
    fah.f_user(fah.user = data.user);
  if (fah.f_passkey != null && fah.passkey != data.passkey)
    fah.f_passkey(fah.passkey = data.passkey);
  if (fah.f_power != null && fah.power != data.power)
    fah.f_power(fah.power = data.power);
  if (fah.f_pause != null && fah.paused != data.paused)
    fah.f_pause(fah.paused = data.paused);
  if (fah.f_idle != null && fah.idle != data.idle)
    fah.f_idle(fah.idle = data.idle);
  if (fah.f_team != null && fah.team != data.team)
    fah.f_team(fah.team = data.team);
  if (fah.f_cause != null) fah.f_cause(data.cause);
}


/******************************** Slot functions ******************************/
function is_active_slot(id) {
  return typeof fah.active_slot != 'undefined' && fah.active_slot == id;
}


function set_status_msg(status, reason) {
  status = status.toLowerCase();
  if (typeof reason != 'undefined' && reason != '' && status == 'paused')
    status_msg = reason;
  else if (status in fah.status_msg)
    status_msg = fah.status_msg[status];
  else status_msg = '';

  $('#box-status-msg')
    .html('<span class="hlarge">' + status + '</span>' + status_msg);
}


function activate_slot(slot) {
  if (typeof fah.active_slot != 'undefined' && fah.active_slot == slot.id)
    return;
  fah.active_slot = slot.id;

  for (var i in fah.slots)
    if (i != slot.id) $('#slot-' + i).removeClass('active');
  $('#slot-' + slot.id).addClass('active');

  $('#box-stats-days').text(slot.eta);
  $('#box-status-points span').text(slot.ppd);
  $('#box-stats-wu').text(slot.prcg);
  $('#box-stats-points').text(slot.creditestimate);
  show_project(slot.project);
  $('#box-status-time').text(slot.timeremaining);
  set_status_msg(slot.status, slot.reason);

  if (slot.project) add_project(slot.project);
  else $('#box-project').html('');
}


function update_slot(entry) {
  var id = parseInt(entry.id, 10);
  var slot;

  if (typeof fah.slots[id] == 'undefined') {
    var i = obj_size(fah.slots);
    $('#slots ul').removeClass('box-pu-' + i);
    if (i >= 3) i = 'x';
    else i += 1;
    $('#slots ul').addClass('box-pu-' + i);

    $('#slots ul').append(
      '<li id="slot-' + id + '">' +
        '<div class="circle">' +
        '<span></span>' +
        '</div>' +
        '<div class="pu">' +
        '<div class="clearfix">' +
        '<div class="pu-type description"></div>' +
        '<div class="pu-load">' +
        '</div>' +
        '</div>' +
        '<div class="pu-bar"></div>' +
        '</div>' +
        '</li>');

    $('#slot-' + id).on('click', function(event) {
      activate_slot(fah.slots[id]);
    });

    var cpuBar = $('#slot-' + id + ' .pu-bar');
    var cpuLabel = $('#slot-' + id + ' .pu-load .hlarge');
    var cpuStartPoint = $('#slot-' + id + ' .pu-type').width();
    var cpuEndPoint =
        cpuBar.width() - cpuLabel.width() * 5 / 3 + cpuStartPoint;

    cpuBar.progressbar({
      value: false,
      change: function() {
        var labelVal = cpuBar.progressbar('value');
        cpuLabel.text(labelVal + "%");
        var labelPos =
            parseInt(cpuBar.width() * labelVal/ 100) - cpuStartPoint;

        if (labelPos < 0) labelPos = 0;
        else if (labelPos > cpuEndPoint) labelPos = cpuEndPoint;

        cpuLabel.css("left", labelPos);
      }
    });

    cpuBar.progressbar('value', 0);
    $('#slot-' + id + ' .pu-bar').progressbar({value: 0});
    fah.slots[id] = slot = {tab: $('#slot-' + id).first()};

  } else slot = fah.slots[id];

  slot.id = id;

  // Description
  if (entry.description !== slot.description) {
    slot.tab.find('.description').text(entry.description.toUpperCase());
    slot.description = entry.description;
  }

  // Status
  if (entry.status !== slot.status || entry.reason !== slot.reason) {
    if (is_active_slot(id)) set_status_msg(entry.status, entry.reason);

    var statusBoxes = {
      RUNNING: 'run',
      PAUSED: 'pause',
      DOWNLOADING: 'download',
      UPLOADING: 'upload',
      STOPPING: 'stop',
      FINISHING: 'finish',
      READY: 'pause',
      DISABLED: 'disabled'
    };
    var circle = slot.tab.find('.circle');
    for (var i in statusBoxes) circle.removeClass(statusBoxes[i]);
    circle.addClass(statusBoxes[entry.status]);
    circle.prop('title', 'Folding slot ' + entry.status);

    slot.status = entry.status;
    slot.reason = entry.reason;
  }

  var prcg = '--';
  if (typeof entry.project == 'undefined') {
    entry.percentdone = '0%';
    entry.creditestimate = '--';
    entry.eta = '--';
    entry.ppd = '--';

  } else prcg = entry.project + ' (' +
    entry.run + ', ' +
    entry.clone + ', ' +
    entry.gen + ')';

  if (entry.ppd == 0) entry.ppd = '--';

  // Progress
  if (entry.percentdone !== slot.percentdone) {
    slot.tab.find('.pu-bar').progressbar({
      value: parseInt(entry.percentdone.substr
                      (0, entry.percentdone.length - 1))})
      .children('.ui-progressbar-value')
      .html('&nbsp;' + entry.percentdone)
      .css({'display': 'block'});
    slot.percentdone = entry.percentdone;
  }

  // Credit estimate
  if (entry.creditestimate !== slot.creditestimate) {
    if (is_active_slot(id))
      $('#box-stats-points').text(entry.creditestimate);
    slot.creditestimate = entry.creditestimate;
  }

  // ETA
  if (entry.streaming) entry.eta = 'Streaming';
  if (entry.eta !== slot.eta) {
    if (is_active_slot(id)) $('#box-stats-days').text(entry.eta);
    slot.eta = entry.eta;
  }

  // PPD
  if (entry.ppd !== slot.ppd) {
    if (is_active_slot(id)) $('#box-status-points span').text(entry.ppd);
    slot.ppd = entry.ppd;
  }

  // PRCG
  if (prcg !== slot.prcg) {
    if (is_active_slot(id)) $('#box-stats-wu').text(prcg);
    slot.prcg = prcg;
  }

  // Project
  if (entry.project !== slot.project) {
    slot.project = entry.project;
    if (is_active_slot(id)) show_project(slot.project);
  }

  // Time remaining
  if (typeof entry.timeremaining == 'undefined')
    entry.timeremaining = 'unknown time';

  if (entry.timeremaining != slot.timeremaining) {
    slot.timeremaining = entry.timeremaining;
    if (is_active_slot(id)) $('#box-status-time').text(slot.timeremaining);
  }

  // First slot loaded
  if (typeof fah.active_slot === 'undefined') activate_slot(slot);
}


function update_slots(data) {
  var slot_ids = {};
  var project_ids = {};

  $.each(data, function(i, entry) {
    slot_ids[entry.id] = true;
    if (entry.project) project_ids[entry.project] = true;

    fah.f_slot(entry);
  });

  // Remove unused projects
  if (obj_size(project_ids) < obj_size(fah.projects))
    $.each(fah.projects, function(i) {
      if (!project_ids[i]) {
        delete fah.projects[i];
        delete fah.descriptions[i];
      }
    });

  // Remove unused slots
  if (obj_size(slot_ids) != obj_size(fah.slots))
    $.each(fah.slots, function(i) {
      if (!slot_ids[i]) {
        fah.slots[i].row.remove();
        delete fah.slots[i];
      }
    });
}


/****************************** Project functions *****************************/
function show_project_description(id) {
  var div = $('#project-description');
  div.html(fah.descriptions[id]);
  div.find('p').css("text-align", "left");
  div.dialog({
    modal: true,
    resizable: false,
    width: 700
  });
  div.find('a').attr({target: '_blank'});
  div.find('.done').on('click', function (e) {
    e.preventDefault();
    div.dialog('destroy');
  });
}


function is_active_project(id) {
  return typeof fah.active_slot != 'undefined' &&
    fah.active_slot in fah.slots &&
    fah.slots[fah.active_slot].project == id;
}


function update_project(p) {
  if (p.id in fah.projects) return;

  var project;
  var description;

  if (typeof p.error != 'undefined') {
    project = '<strong>' + p.error + '</strong>';
    description = project;

  } else {
    // Shorten description if necessary
    var pbrief
    if (fah.max_project_brief - 3 < p.pdesc.length)
      pbrief = p.pdesc.substr(0, fah.max_project_brief - 3) + '...';
    else pbrief = p.pdesc;

    project =
      '<p>I\'m contributing to <span class="hlarge">Project ' + p.id +
      '</span></p>' + pbrief + ' <a href="javascript:void(0)" ' +
      'onclick="show_project_description(' + p.id + '); return false;">' +
      'Learn more</a>';

    description = '<h2>Project ' + p.id + '</h2>' +
      (typeof p.pthumb != 'undefined' && p.pthumb != '' ?
       ('<img src="data:;base64, ' + p.pthumb + '"/>') : '') +
      '<p>Disease Type: ' + p.disease + '</p>' + p.pdesc + '<br/>' +
      '<strong>This project is managed by ' + p.name + ' at ' + p.uni +
      '.</strong>' + (p.url != '' ? ('<p>URL: <a href="' + p.url + '">' +
                                     p.url + '</a></p>') : '') +
      (p.mthumb != '' ?
       ('<div><img src="data:;base64, ' + p.mthumb + '"/></div>') : '') +
      p.mdesc + '<div class="center"> <a href="#" ' +
      'class="button green done">Done</a></div>';
  }

  fah.projects[p.id] = project;
  fah.descriptions[p.id] = description;

  if (is_active_project(p.id)) show_project(p.id);
}


function show_project(id) {
  if (id in fah.projects) {
    $('#box-project').html(fah.projects[id]);
    $('#box-project').find('a').attr('target', '_blank');
  }
}


function add_project(id) {
  if (!id || fah.projects[id] || fah.version == null) return;

  if (is_active_project(id))
    $('#box-project').html('Loading...');

  $.ajax({
    url: fah.project_url,
    type: 'GET',
    data: {'id': id, 'version': fah.version},
    cache: true,
    dataType: 'jsonp',
    success: dispatch,
    error: function () {
      $('#box-project').html('No information.');
    }
  });
}


/****************************** Network functions *****************************/
function send_command(args) {
  args.data = get_arg(args.data, {});
  args.data.sid = fah.sid;
  args.dataType = get_arg(args.dataType, 'json');
  args.cache = get_arg(args.cache, false);
  $.ajax(args);
}


function set_update(id, rate, path, vars) {
  vars = typeof vars !== 'undefined' ? vars : {};
  vars.sid = fah.sid;
  vars.update_id = id;
  vars.update_rate = rate;
  vars.update_path = path;
  $.ajax({
    url: 'api/updates/set',
    data: vars,
    cache: false
  });
}


function dispatch(data) {
  if (data == null) return;

  $.each(data, function(i, cmd) {
    try {
      // debug('Command: ' + JSON.stringify(cmd));

      switch (cmd[0]) {
      case '/api/basic': update_basic(cmd[1]); break;
      case '/api/slots': update_slots(cmd[1]); break;
      case 'heartbeat': if (fah.user == null) reset(); break;
      case 'reset': reset(); break;
      case 'reload': location.reload(true); break;
      case 'project': update_project(cmd[1]); break;
      case 'stats': update_stats(cmd[1]); break;
      case 'unconfigured': unconfigured(); break;
      default: debug('Unknown command: ' + cmd); break;
      }

    } catch (err) {
      debug('Command "' + cmd + '": ' + err);
    }
  });
}


function update_failed(jqXHR, status, error) {
  fah.active_updates--;
  debug(status + ": " + error);

  // Disconnect after 5 consecutive errors unless this is the first
  // attempt then after 50 consecutive errors.
  if (5 < ++fah.failed_updates && fah.last_success || 50 < fah.failed_updates)
    disconnect();
}


function update_succeeded(data) {
  fah.active_updates--;
  fah.failed_updates = 0;
  fah.last_success = new Date().valueOf();
  dispatch(data);
}


function updates(now) {
  if (fah.disconnected || now < fah.last_update + 1000 ||
      1 < fah.active_updates) return;

  fah.last_update = now;
  fah.active_updates++;

  $.ajax({
    url: 'api/updates',
    dataType: 'json',
    data: {sid: fah.sid},
    cache: false,
    error: update_failed,
    success: update_succeeded
  });
}


function disconnect(message, reload) {
  if (typeof message == 'undefined') message = 'disconnected';
  if (typeof reload == 'undefined') reload = true;
  if (fah.disconnected) return;
  fah.disconnected = true;

  fah.sid = ''; // Reset SID

  // Abort any outstanding requests
  if (typeof $.xhrPool != 'undefined') $.xhrPool.abortAll();

  // Disable spinners
  $('.circle').removeClass('run')

  // Open dialog ask to reload
  var data = {
    resizable: false,
    width: 450,
    modal: true,
    dialogClass: 'no-close',
    closeOnEscape: false,
    open: function(event, ui) {
      $('.ui-dialog-titlebar-close', $(this).parent()).hide();
    }
  };

  if (reload)
    data['buttons'] = {'Reload Page?': function() {location.reload();}};

  $('#' + message).dialog(data);
}


function reset() {
  // Abort any outstanding requests
  if (typeof $.xhrPool != 'undefined') $.xhrPool.abortAll();

  // Start updates
  set_update(0, 1, '/api/basic');
  set_update(1, 1, '/api/slots');

  // Check if client was configured
  send_command({url: 'api/configured', success: dispatch});
}


/******************************* Create function ******************************/
var fah_create_client = (function() {
  function fah_create_client(opts) {
    if (typeof opts.user == 'function') fah.f_user = opts.user;
    if (typeof opts.passkey == 'function') fah.f_passkey = opts.passkey;
    if (typeof opts.power == 'function') fah.f_power = opts.power;
    if (typeof opts.pause == 'function') fah.f_pause = opts.pause;
    if (typeof opts.idle == 'function') fah.f_idle = opts.idle;
    if (typeof opts.team == 'function') fah.f_team = opts.team;
    if (typeof opts.cause == 'function') fah.f_cause = opts.cause;
    if (typeof opts.slot == 'function') fah.f_slot = opts.slot;

    // Check browser version
    BrowserDetect.init();
    var browser = BrowserDetect.browser;
    var version = BrowserDetect.version;

    // NOTE: If browser versions are changed here they must also be updated
    // in #browser-warn in index.html.
    if (browser == 'Chrome' && 23 <= version) ;
    else if (browser == 'Firefox' && 16 <= version) ;
    else if (browser == 'Safari' && 5.1 <= version) ;
    else if (browser == 'Explorer' && 8 <= version) ;
    else if (browser == 'Mozilla' && 11 <= version) ; // IE in disguise
    else {
      $('#browser-warn').dialog({
        title: 'Warning: Browser reports as ' + browser + ' version ' +
          version,
        modal: true,
        resizable: false,
        width: 600,
        buttons: {'Proceed': function() {$(this).dialog('destroy');}}
      });
    }

    // Tell other instances to disconnect
    try {
      var intercom = Intercom.getInstance();
      var message = 'fahclient';

      intercom.on(message, function(data) {
        if (fah.timestamp < data.message) disconnect('reopened');
      });

      intercom.emit(message, {message: fah.timestamp});

    } catch (e) {debug(e.message);}

    // Check session ID
    if (typeof fah.sid == 'undefined' || fah.sid == '') {
      location.reload(true);
      return;
    }

    // Track all ajax requests so they can be aborted
    try {
      $.xhrPool = [];
      $.xhrPool.abortAll = function() {
        $(this).each(function(idx, jqXHR) {jqXHR.abort();});
        $.xhrPool.length = 0
      };

      $.ajaxSetup({
        timeout: 30000,
        beforeSend: function(jqXHR) {$.xhrPool.push(jqXHR);},
        complete: function(jqXHR) {
          if (typeof $.xhrPool == 'undefined') return;
          var index = $.xhrPool.indexOf(jqXHR);
          if (index > -1) $.xhrPool.splice(index, 1);
        }
      });

    } catch (e) {debug(e.message);}

    // Initialize communication with client
    reset();

    // Active on mouse move
    $(document).mousemove(function () {
      fah.last_mouse = new Date().valueOf();
    });
    $(document).hover(function () {fah.mouse_active = true;},
                      function () {fah.mouse_active = false;});

    // Timer loop
    setInterval(function () {
      if (fah.disconnected) return;

      // If the mouse is in the window and it has moved in the last 10
      // minutes or it is not in the window but was in the last 2 mins
      // then update.  Otherwise, idle.
      var now = new Date().valueOf();
      if ((fah.mouse_active &&
           fah.last_mouse + fah.mouse_inside_timeout < now) ||
          (!fah.mouse_active &&
           fah.last_mouse + fah.mouse_outside_timeout < now)) {
        return;
      }

      check_stats(now);
      updates(now);
    }, 1000);
  };

  fah_create_client.prototype.disconnect = function() {disconnect();};

  fah_create_client.prototype.set_cause = function(cause) {
    send_command({url: 'api/set', data: {'cause': cause}});
  };

  fah_create_client.prototype.set_power = function(power) {
    send_command({url: 'api/set', data: {'power': power}});
  };

  fah_create_client.prototype.set_pause = function(pause) {
    send_command({url: 'api/set', data: {'pause': pause}});
  };

  fah_create_client.prototype.set_finish = function(finish) {
    send_command({url: 'api/set', data: {'finish': finish}});
  };

  fah_create_client.prototype.set_idle = function(idle) {
    send_command({url: 'api/set', data: {'idle': idle}});
  };

  fah_create_client.prototype.set_identity =
    function(new_user, new_passkey, new_team) {
      if (new_user == '') new_user = 'Anonymous';
      if (new_team == '') new_team = 0;

      var data = {};
      var changed = false;

      if (new_user !== fah.user) {
        if (!/^[!-~]+$/.test(new_user)) {
          alert('User name must be a non-empty string containing ' +
                'only alphanumeric characters, standard ' +
                'punctuation and no white-space.');
          return false;
        }

        data.user = new_user;
        changed = true;
      }

      if (new_passkey !== fah.passkey) {
        if (new_passkey != '' &&
            !/^[a-fA-F0-9]{32}$/.test(new_passkey)) {
          alert('The passkey must be a 32 character hexadecimal ' +
                'string.');
          return false;
        }

        data.passkey = new_passkey;
        changed = true;
      }

      if (!/^\d{1,10}$/.test(new_team) ||
          $.isNumeric(new_team) == false) {
        alert('Team number must be a whole number no more than ten ' +
              'digits long.');
        return false;
      }

      new_team = parseInt(new_team, 10);
      if (new_team !== fah.team) {
        data.team = new_team;
        changed = true;
      }

      if (changed) send_command({url: 'api/set', data: data});
      return true;
    };

  return fah_create_client;
})();


/******************************************************************************/
function update_user(user) {
  $('#user-username').text(user);
  $('#user').val(user);
}


function update_passkey(passkey) {
  $('#pass').val(passkey);
}


function update_team(team) {
  $('#user-team').text('Team ' + team);
  $('#team').val(team);
}


function update_cause(cause) {
  $('#box-cause-id').selectbox('detach');
  $('#box-cause-id').val(cause);
  $('#box-cause-id').selectbox('attach');
}


function update_power(power) {
  power = power.toUpperCase();

  var v = {'LIGHT': 1, 'MEDIUM': 2, 'FULL': 3};
  $('#slider').slider('option', 'value', v[power]);

  var margin = {'LIGHT': -1, 'MEDIUM': -12, 'FULL': -24}[power];
  $('#slider').find(".ui-slider-handle").css({"margin-left": margin});
}


function update_pause(pause) {
  if (pause) {
    $('#btn-run').show();
    $('#btn-stop').hide();

  } else {
    $('#btn-run').hide();
    $('#btn-stop').show();
  }
}


function update_idle(idle) {
  if (idle) $('#idle').prop('checked', true);
  else $('#not_idle').prop('checked', true);
}


function set_cause() {
  fah.client.set_cause($('#box-cause-id').val());
}


function set_power(power) {
  var v = {1: 'LIGHT', 2: 'MEDIUM', 3: 'FULL'};
  fah.client.set_power(v[power]);
}


function set_pause(pause) {fah.client.set_pause(pause);}
function set_finish(finish) {fah.client.set_finish(finish);}
function set_idle(idle) {fah.client.set_idle(idle);}


function set_identity() {
  return fah.client.set_identity($('#user').val().trim(),
                                 $('#pass').val().trim(),
                                 $('#team').val().trim());
}


/************************* Main Function **************************************/
function main(sid) {
  fah.sid = sid;

  fah.client = new fah_create_client({
    user: update_user,
    passkey: update_passkey,
    team: update_team,
    cause: update_cause,
    power: update_power,
    pause: update_pause,
    idle: update_idle,
    slot: update_slot
  });

  // Open all links in new tab
  $('a').attr({'target': '_blank'});

  var slidr = $('#slider');
  // Segmented slider + fit slider handle in track
  slidr.slider({
    min: 1, max: 3, range: "min", value: 1,
    slide: function(event, ui) {
      var margin = {1: -2, 2: -12, 3: -24}[ui.value];
      slidr.find(".ui-slider-handle").css({"margin-left": margin});
    }
  });

  // Demo select tab
  $('.box-pu li').click(function(e) {
    e.preventDefault();
    $('.box-pu li').removeClass('active');
    $(this).addClass('active');
  });

  // Demo with 2 pu swap contents
  $('.box-pu-2 li').unbind('click').click(function(e) {
    e.preventDefault();

    $('.box-pu-2 li').removeClass('active');
    $(this).addClass('active');

    var left_pu = $('.col-left-pu').contents();
    var right_pu = $('.col-right-pu').contents();

    $('.col-left-pu').append(right_pu);
    $('.col-right-pu').append(left_pu);
  });

  // JQuery replacement so we can style the drop down
  $("#box-cause-id").selectbox();

  // Stop - Start dialog and button functionality
  $('#btn-run').on('click', function(e) {
    e.preventDefault();
    set_pause(false);
  });

  $('#btn-stop').on('click', function(e) {
    e.preventDefault();
    $('#stop-popup').dialog({
      modal: true,
      resizable: false,
      width: 441
    });
  });

  $('#stop-popup .cancel').on('click', function(e) {
    e.preventDefault();
    set_finish(true);
    $('#stop-popup').dialog('destroy');
  });

  $('#stop-popup .stop').on('click', function(e) {
    e.preventDefault();
    set_pause(true);
    $('#stop-popup').dialog('destroy');
  });

  // Help dialog and button functionality
  $('.btn-help').click(function(e) {
    e.preventDefault();
    $('#help-popup').dialog({
      modal: true,
      resizable: false,
      width: 850
    });
  });

  $('#help-popup a.done').on('click', function(e) {
    e.preventDefault();
    $('#help-popup').dialog('destroy');
  });

  // Learn more dialog and button functionality
  $('#btn-learn').click(function(e) {
    e.preventDefault();
    $('#learn-popup').dialog({
      modal: true,
      resizable: false,
      width: 840
    });
  });

  $('#learn-popup a.done').on('click', function(e) {
    e.preventDefault();
    $('#learn-popup').dialog('destroy');
  });

  // Setup Identity dialog and button functionality
  $('#btn-setupid').click(function(e) {
    e.preventDefault();
    $('#setupid-popup').dialog({
      modal: true,
      resizable: false,
      width: 775
    });
  });

  $('#setupid-btn-cancel').on('click', function(e) {
    e.preventDefault();
    $('#setupid-popup').dialog('destroy');
    $('#user').val(fah.user);
    $('#team').val(fah.team);
    $('#pass').val(fah.passkey);
  });

  $('#setupid-btn-save').on('click', function(e) {
    e.preventDefault();
    if (set_identity())
      $('#setupid-popup').dialog('destroy');
  });

  $('#box-cause-id').on('change', set_cause);
  $('#slider').on('slidestop', function(e, ui) {set_power(ui.value);});
  $('#idle').change(function (e) {set_idle($(this).is(':checked'));});
  $('#not_idle').change(function (e) {set_idle(!$(this).is(':checked'));});

  // Email Link
  var subject = 'Our unused computer power can help find a cure.';
  var body = 'Here is a site where we can share our unused computer power ' +
      'to help disease researchers find cures for diseases like ' +
      'COVID-19, Alzheimer\'s, Cancer, and Parkinson\'s. It only takes ' +
      'about 5 minutes to join the cause.\n\n Find at more at ' +
      'https://foldingathome.org/';

  $('a.email').attr({
    href:
    'mailto:?subject=' + subject + '&body=' + body.replace('\n', '%0A'),
    rel: 'nofollow',
    title: 'Click here to open your email and send this message to your ' +
      'friends:\n\n---------------------------------------------------' +
      '-----------------------------------------------\nSubject: ' +
      subject + '\n\n' + body
  });

  // Passkey field on hover show-hide
  $('#pass').hover(function() {$(this).attr('type', 'text');},
                   function() {$(this).attr('type', 'password');});

  // Unconfigured functionality
  $('#btn-select-id').on('click', function(e) {
    e.preventDefault();
    $('#unconfigured').dialog('destroy');
    var c = $('input[name=account_type]:checked').val();

    if (c == '1') send_command({url: 'api/configured/set'});
    else $('#setupid-popup').dialog({
      modal: true,
      resizable: false,
      width: 775
    });
  });
}


$(function () {
  $.ajax({method: 'PUT', url: '/api/session?_=' + Math.random()}).done(main)
});
