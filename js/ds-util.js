var ds = ds || {};
ds.util = (function() {
  var util = {};
  util.getYearWeek = function getYearWeek(date) {
    var date2 = new Date(date.getFullYear(), 0, 1);
    var day1 = date.getDay();
    if (day1 === 0) {
      day1 = 7;
    }
    var day2 = date2.getDay();
    if (day2 === 0) {
      day2 = 7;
    }
    d = Math.round((date.getTime() - date2.getTime() + (day2 - day1) * (24 * 60 * 60 * 1000)) / 86400000);
    return Math.ceil(d / 7) + 1;
  };

  util.datepicker = function($element, dateType) {
    $element.datepicker("destroy");
    $element.val("");

    var opt = {
      showWeek: true,
      dateFormat: 'yy-mm-dd',
      changeMonth: true,
      changeYear: true,
      numberOfMonths: 1,
      calculateWeek: function(dateText) {
        var date = new Date(dateText);
        date.setDate(date.getDate() + (6 - date.getDay()));
        var week = ds.util.getYearWeek(date);
        return week;
      }
    };

    if (dateType === 'monthly') {
      opt.dateFormat = 'yy-mm';
    } else if (dateType === 'daily') {
      opt.dateFormat = 'yy-mm-dd';
    } else if (dateType === 'weekly') {
      opt.onSelect = function(dateText, inst) {
        var date = new Date(dateText);
        // get the last day of this week
        date.setDate(date.getDate() + (6 - date.getDay()));
        var year = date.getFullYear();
        var week = ds.util.getYearWeek(date);
        $(this).val(year + "-" + week);
      };

    } else if (dateType === 'quarterly') {
      opt.onSelect = function(dateText, inst) {
        var date = new Date(dateText);
        var year = date.getFullYear();
        var quarter = Math.ceil((date.getMonth() + 1) / 3);
        $(this).val(year + "-0" + quarter);
      };
    } else if (dateType === 'yearly') {
      opt.dateFormat = 'yy';
    }

    $element.datepicker(opt);

    $("#ui-datepicker-div").unbind("click");
    $("#ui-datepicker-div").bind("click", function(e) {
      e.stopPropagation();
    });
  };

  util.getApiHost = function(url) {
    var API_HOST = '';
    if (!util.isBlank(url)) {
      var index = url.lastIndexOf("/dataservice");
      API_HOST = url.substring(0, index);
    } else {
      API_HOST = (window.location.protocol === 'https:' ? 'https:' : 'http:') + "//"
              + (document.location.hostname === "" ? "localhost" : document.location.hostname)
              + (document.location.port !== "" ? ":" + document.location.port : "");
    }

    return API_HOST;
  };

  // shorten string as except length, such as "hello this is an example" :
  // "hello this is..."
  util.shortString = function(sourceString, targetLength) {
    var resultString = "";
    if (!util.isBlank(sourceString) && sourceString.length > targetLength) {
      resultString = sourceString.substring(0, targetLength - 4) + '...';
    } else {
      resultString = sourceString;
    }

    return resultString;
  };

  // order asc
  util.seqComparator = function(a, b) {
    return parseInt(a.seq) - parseInt(b.seq);
  };

  /**
   * Add highchart export config in settings, need an global variable exportURL
   * 
   * @param options
   *          can be a json string or an object
   */
  util.addChartExport = function(settings, exportURL) {
    var targetSettings = {};

    if (typeof settings === "string" && settings.constructor === String) {
      settings = jQuery.parseJSON(settings);
    }

    if (!util.isBlank(exportURL)) {
      $.extend(true, targetSettings, settings, {
        exporting: {
          enabled: true,
          url: exportURL
        }
      });

      return targetSettings;
    } else {
      return settings;
    }

  };

  /**
   * Check input value undefined or null will return ture
   * 
   * @param para
   *          input value
   * @return
   */
  util.isBlank = function(para) {
    if (para === undefined || typeof para === "undefined" || para === null) {
      return true;
    } else {
      return false;
    }
  };

  util.checkUrl = function(url) {
    var regEx = /^(https?:\/\/)?[\da-z-]+(\.[\da-z-]+)*(\:\d+)?(\/[\da-z-]*)*(\/?|([\da-z-]+\?[\da-z-]+=[\da-z-]+(&[\da-z-]+=[\da-z-]+)*))$/;
    if (!util.isBlank(url) && regEx.test(url)) {
      return true;
    } else {
      return false;
    }
  };

  util.upperFirstChar = function(str) {
    if (str.length > 0) {
      str = str.substring(0, 1).toUpperCase() + str.substring(1);
    }
    return str;
  };

  util.lowerFirstChar = function(str) {
    if (str.length > 0) {
      str = str.substring(0, 1).toLowerCase() + str.substring(1);
    }
    return str;
  };

  /**
   * Will check the security code
   */
  util.securityHandler = function(error) {
    if (!util.isBlank(error) && !util.isBlank(error.description) && error.code >= 1000 && error.code < 2000) {
      alert(error.description);
    }
  };

  /**
   * will solve all the error message
   */
  util.errorHandler = function(error, isAlertError) {
    var description = MESSAGES.get("COMMON_ERROR_MSG");
    if (!util.isBlank(error) && !util.isBlank(error.description)) {
      if (202 === error.code) {
        util.refreshPage();
      }
      description = error.description;
    }

    if (util.isBlank(isAlertError) || (isAlertError === true)) {
      alert(description);
    }
  };

  util.refreshPage = function() {
    location.reload(false);
  };

  util.getCSRFToken = function() {
    return $("#csrf_token_id").val() || "";
  };

  util.barOrColumn = function(chartType) {
    var defaultOption = '<option value="column">Column</option>' + '<option value="spline">Line</option>'
            + '<option value="pie">Pie</option>' + '<option value="areaspline">Area</option>';
    var chartOptionsBar = '<option value="spline">Line</option>' + '<option value="bar">Bar</option>'
            + '<option value="pie">Pie</option>' + '<option value="areaspline">Area</option>';
    var chartOptionsColumn = '<option value="column">Column</option>' + '<option value="spline">Line</option>'
            + '<option value="pie">Pie</option>' + '<option value="areaspline">Area</option>';

    if (chartType == 'column') {
      return chartOptionsColumn;
    } else if (chartType == 'bar') {
      return chartOptionsBar;
    } else {
      return defaultOption;
    }
  };

  util.statusNameColorMap = {
    'new': {
      'color': '#FCCE0D',
      'borderColor': '#FCCE0D'
    },
    'assigned': {
      'color': '#F47973',
      'borderColor': '#DB9A91'
    },
    'on_dev': {
      'color': '#F9BB62',
      'borderColor': '#E2B28F'
    },
    'modified': {
      'color': '#EAA7E8',
      'borderColor': '#CFA9DB'
    },
    'post': {
      'color': '#A78DCE',
      'borderColor': '#9E93BA'
    },
    'on_qa': {
      'color': '#7AEADC',
      'borderColor': '#79B7B0'
    },
    'verified': {
      'color': '#6ECE95',
      'borderColor': '#67A086'
    },
    'closed': {
      'color': '#5FB7CE',
      'borderColor': '#70AABA'
    },
    'release_pending': {
      'color': '#EFD195',
      'borderColor': '#D3B994'
    },
    'total_open': {
      'color': '#6EB8F9',
      'borderColor': '#4A9BE5'
    }
  }; // init the color map

  // count means how times you enter this function with the same serieName
  util.getBugzillaSerieColor = function(serieName, statusColorCache) {
    if (!(typeof serieName === "string" && serieName.constructor === String)) { return null; }

    // due to unify up/low cases.
    var key = serieName.toLowerCase();

    var statusObj = util.statusNameColorMap[key];
    if (ds.util.isBlank(statusObj)) {
      return null;
    } else {
      // this is for call judgement, no param just return.
      if (ds.util.isBlank(statusColorCache)) { return statusObj; }

      if (!ds.util.isBlank(statusColorCache[key])) {
        var cacheColorObj = statusColorCache[key];
        cacheColorObj.color = $.xcolor.lighten(cacheColorObj.color).getColor();
        cacheColorObj.borderColor = $.xcolor.lighten(cacheColorObj.borderColor).getColor();
        return cacheColorObj;
      } else {
        statusColorCache[key] = {};
        statusColorCache[key].color = statusObj.color;
        statusColorCache[key].borderColor = statusObj.borderColor;
        return statusObj;
      }
    }
  };

  util.getAPINameByFullUrl = function(fullUrl) {
    if (ds.util.isBlank(fullUrl) && $.trim(fullUrl) == "") {
      return "";
    } else {
      return fullUrl.substring(fullUrl.lastIndexOf("/dataservice"), fullUrl.indexOf('?'));
    }
  };

  util.checkDateOrder = function(fromValue, toValue, interval) {
    if (fromValue !== '' && toValue !== '') {
      if (interval === 'monthly' || interval === 'daily' || interval === 'yearly') {
        var fromDate = Date.parse(fromValue);
        var toDate = Date.parse(toValue);
        if (fromDate > toDate) {
          alert(MESSAGES.get('TIME_ORDER_ERROR'));
          return false;
        }
      } else if (interval === 'weekly' || interval === 'quarterly') {
        if (fromValue.indexOf("-") >= 0 && toValue.indexOf("-") >= 0) {
          try {
            var fromArr = fromValue.split("-");
            var toArr = toValue.split("-");

            var fromYear = parseInt(fromArr[0]);
            var fromInter = parseInt(fromArr[1]);

            var toYear = parseInt(toArr[0]);
            var toInter = parseInt(toArr[1]);

            if (fromYear > toYear) {
              alert(MESSAGES.get('TIME_ORDER_ERROR'));
              return false;
            } else if ((fromYear === toYear) && (fromInter > toInter)) {
              alert(MESSAGES.get('TIME_ORDER_ERROR'));
              return false;
            }
          } catch (e) {
            alert("error:" + e);
            return false;
          }
        } else {
          alert(MESSAGES.get('SPRINT_ORDER_ERROR'));
          return false;
        }
      }

      return true;
    }
    ;
  };

  util.startsWith = function(value, str) {
    if (!util.isBlank(value)) {
      return value.slice(0, str.length) === str;
    } else {
      return false;
    }
  };

  util.encodeParaValue = function(paraValue) {
    if ($.isArray(paraValue) === true) {
      for (var i = 0; i < paraValue.length; i++) {
        paraValue[i] = encodeURIComponent(paraValue[i]);
      }

    } else {
      paraValue = encodeURIComponent(paraValue);
    }

    return paraValue;
  };
  
  
  util.unEncodeChar = function(str) {
    str = str || "";
    str = str.replace(/%5B/g, "[");
    str = str.replace(/%5D/g, "]");
    str = str.replace(/%7B/g, "{");
    str = str.replace(/%7D/g, "}");
    str = str.replace(/%2C/g, ",");
    str = str.replace(/%3A/g, ":");
    str = str.replace(/%26/g, "&");
    return str;
  };
  
  
  util.parseEscapeChar = function(str) {
    str = str || "";
    str = str.replace(/\/\[/g, "%2F%5B");
    str = str.replace(/\/\]/g, "%2F%5D");
    str = str.replace(/\/\{/g, "%2F%7B");
    str = str.replace(/\/\}/g, "%2F%7D");
    str = str.replace(/\/\,/g, "%2F%2C");
    str = str.replace(/\/\:/g, "%2F%3A");
    str = str.replace(/\/\!/g, "%2F!");
    str = str.replace(/\/\&/g, "%2F%26");
    return str;
  };
  
  util.parseUnescapeChar = function(str) {
    str = str || "";
    str = str.replace(/\%2F\%5B/g, "/[");
    str = str.replace(/\%2F\%5D/g, "/]");
    str = str.replace(/\%2F\%7B/g, "/{");
    str = str.replace(/\%2F\%7D/g, "/}");
    str = str.replace(/\%2F\%2C/g, "/,");
    str = str.replace(/\%2F\%3A/g, "/:");
    str = str.replace(/\%2F\%26/g, "/&");
    str = str.replace(/\%2F!/g, "/!");
    return str;
  };
  
  /**
   * if parameter string value contains reserved words will escape it by
   * Harvester way([ -> \])
   */
  util.escapeReservedChar = function(str) {
    str = str || "";
    str = str.replace(/\[/g, "/[");
    str = str.replace(/\]/g, "/]");
    str = str.replace(/\{/g, "/{");
    str = str.replace(/\}/g, "/}");
    str = str.replace(/\,/g, "/,");
    str = str.replace(/\:/g, "/:");
    str = str.replace(/\!/g, "/!");
    str = str.replace(/\&/g, "/&");
    return str;
  };

  /**
   * the unescape for function escapeReservedChar
   */
  util.unescapeReservedChar = function(str) {
    str = str || "";
    str = str.replace(/\/\[/g, "[");
    str = str.replace(/\/\]/g, "]");
    str = str.replace(/\/\{/g, "{");
    str = str.replace(/\/\}/g, "}");
    str = str.replace(/\/\,/g, ",");
    str = str.replace(/\/\:/g, ":");
    str = str.replace(/\/\!/g, "!");
    str = str.replace(/\/\&/g, "&");
    return str;
  };

  util.getPosition = function($element) {
    var el = $element[0];
    var pos = {};
    $.extend(pos, (typeof el.getBoundingClientRect === 'function') ? el.getBoundingClientRect() : {
      width: el.offsetWidth,
      height: el.offsetHeight
    }, $element.offset());
    return pos;
  };

  /**
   * the common tip tool
   */
  util.showTip = function($target, content, tipId, closeable, closeCallBack) {
    var pos = util.getPosition($target);
    var date = new Date();
    var id = tipId || date.getMilliseconds();
    var $tip = '<div id="' + id + '" class="tooltip fade right in">' + '<div class="tooltip-arrow"></div>';

    if (ds.util.isBlank(closeable) || closeable === true) {
      $tip = $tip + '<div class="tooltip-inner">' + content;
      $tip = $tip + '<div class="close">x</div>';
    } else {
      $tip = $tip + '<div class="tooltip-inner no-close">' + content;
    }

    $tip = $tip + '</div></div>';

    $("#" + id).remove();
    $("body").append($tip);

    var actualHeight = $("#" + id)[0].offsetHeight;
    var tp = {
      top: pos.top + pos.height / 2 - actualHeight / 2,
      left: pos.left + pos.width
    };
    $("#" + id).css("top", tp.top);
    $("#" + id).css("left", tp.left);

    if (ds.util.isBlank(closeable) || closeable === true) {
      $(".tooltip-inner").delegate(".close", "click", function() {
        $("#" + id).remove();
        var expires_date = 300;
        $.cookie(tipId, true, {
          expires: expires_date
        });
        if ($.isFunction(closeCallBack)) {
          closeCallBack();
        }
      });
    }
    ;
  };

  /**
   * Format a number and return a string based on input settings
   * 
   * @param {Number}
   *          number The input number to format
   * @param {Number}
   *          decimals The amount of decimals
   * @param {String}
   *          decPoint The decimal point, defaults to the one given in the lang
   *          options
   * @param {String}
   *          thousandsSep The thousands separator, defaults to the one given in
   *          the lang options
   */
  util.numberFormat = function(number, decimals, decPoint, thousandsSep) {
    lang = Highcharts.getOptions().lang,
    // http://kevin.vanzonneveld.net/techblog/article/javascript_equivalent_for_phps_number_format/
    n = +number || 0, c = decimals === -1 ? (n.toString().split('.')[1] || '').length : // preserve
    // decimals
    (isNaN(decimals = Math.abs(decimals)) ? 2 : decimals), d = decPoint === undefined ? lang.decimalPoint : decPoint,
            t = thousandsSep === undefined ? lang.thousandsSep : thousandsSep, s = n < 0 ? "-" : "",
            i = String(parseInt(n = Math.abs(n).toFixed(c))), j = i.length > 3 ? i.length % 3 : 0;

    return (s + (j ? i.substr(0, j) + t : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + t) + (c ? d
            + Math.abs(n - i).toFixed(c).slice(2) : ""));
  }
  return util;
})();
