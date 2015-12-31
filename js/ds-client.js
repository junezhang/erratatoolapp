// if String has no startsWith function for this Browser, create one.
if (typeof String.prototype.startsWith !== 'function') {
  String.prototype.startsWith = function(str) {
    return this.slice(0, str.length) === str;
  };
}

/**
 * Data Service Client. This client is used for call data service api and make a
 * customer report chart.
 */
var DsClient = function(setting, type) {
  this.api;
  this.apis = [];
  this.paramertChecKList = [];
  this.currentApi;
  this.data;
  this.CALLBACK = 'callback=?';
  this.COLUMN = 'column';
  this.STACK = 'stack';
  this.LINE = 'spline';
  this.PIE = 'pie';
  this.BAR = 'bar';
  this.AREA = 'areaspline';
  this.API_HOST = ds.util.getApiHost();
  this.API_URL = this.API_HOST + '/dataservice/api/sys/api/all?callback=?';
  this.POINTED_API = this.API_HOST + '/dataservice/api/sys/api/name/';
  this.IFRAME_API = this.API_HOST + '/dataservice/chart';
  this.PEOPLE_SEARCH_API = this.API_HOST + '/dataservice/api/sys/peopleSearch';
  this.json;
  this.chart;
  this.options;
  this.index = 0;
  this.reportdiv = setting.reportdiv;
  this.datadiv = setting.datadiv;
  this.helpLinkURL = setting.helpLinkURL || "";
  this.manualInit = setting.manualInit || false;
  this.clientOptions;
  this.clientool = !ds.util.isBlank(type) ? true : false;
  this.editableAPI = false;
  this.numberFormats = {
    "interval": function(num, decimals, decimalPoint, thousandsSep) {
      var str = "";
      var h = num % 24;
      str += ds.util.numberFormat(h, 2, decimalPoint, thousandsSep) + "H";
      var d = parseInt(num / 24);
      if (0 === d) { return str; }
      var m = parseInt(d / 30);
      d = d % 30;
      str = ds.util.numberFormat(d, 0) + "D " + str;
      if (0 === m) { return str; }
      var y = parseInt(m / 12);
      m = m % 12;
      str = ds.util.numberFormat(m, 0) + "M " + str;
      if (0 === y) { return str; }
      return ds.util.numberFormat(y, 0) + "Y " + str;

    }
  };
  this.dateConfig = {
    "S": {
      "name": "Sprint",
      "value": "sprint"
    },
    "D": {
      "name": "Daily",
      "value": "daily"
    },
    "W": {
      "name": "Weekly",
      "value": "weekly"
    },
    "M": {
      "name": "Monthly",
      "value": "monthly"
    },
    "Q": {
      "name": "Quarterly",
      "value": "quarterly"
    },
    "Y": {
      "name": "Yearly",
      "value": "yearly"
    }
  };

  this.cloneMode = false;
  this.serialParaWithRep = false;
  this.clonedAPIParamsMap = [];
  this.willRemoveParamsOfClonedAPI = [];
  this.cloneDoneCount = 0;
  this.cloneFailCount = 0;
  this.cloneAlwaysCount = 0;
  this.components = {};
  if (!this.manualInit) {
    this.init();
  }
};

var Serie = function(name, oldname, type, belongsto, color, borderColor, lineStyle) {
  this.name = name;
  this.oldname = oldname;
  this.type = type;
  this.belongsto = belongsto;
  this.color = color;
  this.borderColor = borderColor;
  this.lineStyle = lineStyle;
};

var Yaxis = function(enabled, title, unit) {
  this.enabled = enabled;
  this.title = title;
  this.unit = unit;
};

var Api = function(id, name, pageid, classification, defaultType, img, description) {
  this.id = id;
  this.name = name;
  this.pageid = pageid;
  this.classification = classification;
  this.defaultType = defaultType;
  this.img = img;
  this.parameters = [];
  this.description = description;
};

var Parameter = function(p) {
  this.id = p.id;
  this.name = p.name;
  this.sequence = p.sequence;
  this.type = ds.util.isBlank(p.type) ? 'text' : p.type;
  this.required = p.required;
  this.requiredGroup = p.requiredGroup;
  this.parentId = ds.util.isBlank(p.parentId) ? '' : p.parentId;
  this.encoded = p.encoded;
  this.description = p.description;
  this.helpLink = p.helpLink || "";
  this.helpContent = p.helpContent || "";
};

var PieData = function(name, y, color) {
  this.name = name;
  this.y = y;
  this.color = color;
  this.showInLegend = $.isNumeric(y);
  this.visiable = $.isNumeric(y);
};

DsClient.prototype.DsClient = DsClient;

/**
 * Init client chart options and apis
 * 
 * @returns
 */
DsClient.prototype.init = function() {
  var dfd = $.Deferred();
  var client = this;
  client.initOptions();
  if (client.clientool) {
    if (client.checkAPIInit()) {
      client.renderApiInput(data);
      dfd.resolve(client);
    } else {
      client.initApi().done(function(data) {
        if (client.checkAPIInit()) {
          client.renderApiInput(data);
        }
        dfd.resolve(client);
      }).fail(function() {
        dfd.reject(client);
      });
    }
  }

  return dfd.promise();
};

/**
 * This method can be executed when client is inited
 * 
 * @param targetAPI
 */
DsClient.prototype.cloneAPI = function(targetAPI) {
  $("#api").val(targetAPI);
  var client = this;
  if (client.checkAPIInit()) {
    client.renderClonedParams();
  } else {
    client.initApi().done(function(data) {
      client.renderClonedParams();
    });
  }
};

/**
 * Check apis value is inited
 * 
 * @returns {Boolean}
 */
DsClient.prototype.checkAPIInit = function() {
  var client = this;
  return (!ds.util.isBlank(client.apis) && $.isArray(client.apis) && (client.apis.length > 0));
};

/**
 * the base setting of the highchart options
 */
DsClient.prototype.initOptions = function(data) {
  var client = this;
  var formatter = null;
  var tooltipFormatter = null;
  var dataLabelsFormatter = null;
  var hasDataType = data !== undefined && data.highchart !== undefined && data.highchart.dataType !== undefined;
  if (hasDataType) {
     formatter= client.numberFormats[data.highchart.dataType];
     tooltipFormatter = function() {
       //'<span style="color:{series.color}">{series.name}</span>: <b>{point.y}</b>'
       var s = this.x;
       s+='<br/><span style="color:'+this.series.color+'">'+this.series.name+'</span>: <b>'+formatter(this.y)+'</b>';
       return s;
     };
     dataLabelsFormatter = function() {
       //{y}
       return formatter(this.y);
     };
  }
  this.options = {
    chart: {
      renderTo: this.reportdiv
    },
    
    // this options is inlcuded by highchart modules/no-data-to-display
    lang: {
      noData: "No Available Data"
    },
    
    // this options is inlcuded by highchart modules/no-data-to-display
    noData: {
      style: {
        fontWeight: 'bold',
        fontSize: '15px',
        color: '#303030',
        fontFamily: 'overpass'
      }
    },
    colors: ['#C6B4DB', '#91CFF9', '#A3E5E1', '#EADAB5', '#FCC495', '#ADD8D5', '#F2BDB6', '#F4D295', '#C5E8C5', '#8DC5D8',
        '#F4E5A6', '#D0DBA1', '#8EC1A3', '#D8AFD4', '#B6D2F2', '#CCB29E', '#EAA192', '#F2D1D1', '#EA9DA2', '#F2CBEF'],
    borderColors: ['#9E93BA', '#82BBDB', '#81C6BF', '#D3B994', '#E2B28F', '#79B7B0', '#DB9A91', '#DBB87F', '#9DC99D',
        '#70AABA', '#DBCC8F', '#B5B783', '#67A086', '#B386B5', '#8AACCE', '#AD8C76', '#CE7A6A', '#E5B3AC', '#CE8088', '#CFA9DB'],
    credits: {
      enabled: false
    },
    plotOptions: {
      series: {
        cursor: 'pointer',
        dataLabels: {
          enabled: true
        },
        point: {
          events: {
            click: function(event) {
              client.drillDown(this, event);
            }
          }
        },
        marker: {
          ridius: 1,
          enabled: true,
          symbol: "circle"
        }
      },
      spline: {
        cursor: 'pointer'
      },
      column: {
        cursor: 'pointer',
        stacking: ''
      },
      areaspline: {
        cursor: 'pointer',
        stacking: 'normal',
        tooltip: {
          pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y} / {point.total}</b><br/>'
        },
        lineWidth: 1,
        states: {
          hover: {
            lineWidth: 1
          }
        }
      },
      pie: {
        allowPointSelect: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: true,
          useHTML: true,
          borderRadius: 5,
          backgroundColor: 'rgba(252, 255, 197, 0.7)',
          borderWidth: 1,
          color: '#000000',
          connectorColor: '#000000',
          borderColor: '#AAA',
          padding: 5,
          format: '<b style="color:{point.color}">{point.name}</b>: {point.y} ({point.percentage:.2f} %)'
        },
        tooltip: {
          pointFormat: '<b><span style="color:{point.color};font-weight:bold">{point.y}</span><span> / {point.total} ( </span><span style="color:{point.color};font-weight:bold">{point.percentage:.2f} %</span> )</b><br/>'
        }
      }
    },
    title: {
      text: ''
    },
    subtitle: {
      text: ''
    },
    xAxis: {
      labels: {
        staggerLines: 1,
        step: 1
      }
    },
    yAxis: [{
      labels: {
        format: "{value}"
      },
      title: {
        text: ""
      },
      min: 0
    }],
    tooltip: {
      formatter: tooltipFormatter
    },
    series: [],
    exporting: {
      enabled: false
    }
  };
  if (hasDataType) {
    this.options.plotOptions.series.dataLabels.formatter = dataLabelsFormatter;
  }
};

/** ****************** drill down core code start ******************* */

/**
 * DrillDown function enterance the data structure example: data.detailEnabled =
 * true; data.detailAPI = { "apiURI" :
 * "/dataservice/api/bugzilla/bugtrend/details", "commonParameters":{ "product":
 * "Red Hat Enterprise Linux 6", }, "apiIndicatorIndexes" : [ { "apiIndex" : 0,
 * "parameters" : { "date" : "2013-04", "status" : "new" } }, { "apiIndex" : 1,
 * "parameters" : { "date" : "2013-05", "status" : "open" } } ] };
 * 
 * @param target
 *          the higchart click target get from highchart series.point.click
 * @param event
 *          the highchart client event object
 */
DsClient.prototype.drillDown = function(target, event) {
  var client = this;

  if (!ds.util.isBlank(this.data.detailAPI) && this.showDetail === true) {
    var x = target.x;
    var index = target.series.options.detailAPIIndex[x];
    var detailAPI = this.getDetailAPI(index);
    var bugzillaReg = /bugzilla/;
    var isBugzillAPI = false;

    if (!ds.util.isBlank(detailAPI) && (bugzillaReg.test(detailAPI))) {
      isBugzillAPI = true;
    }
    
    var id = client.showDrillContainer(isBugzillAPI);

    client.detailIdRequest(detailAPI).done(function(data) {
      client.showDetailTable(id, data, isBugzillAPI);
    }).fail(function(result) {
      var description = MESSAGES.get("COMMON_ERROR_MSG");
      if (!ds.util.isBlank(result.error) && !ds.util.isBlank(result.error.description)) {
        description = result.error.description;
      }

      $(".drill-container .loader").html("<font style='color:red'>" + description + "</font>");
    });
  }
};

/**
 * Show drill down dialog by detai API index
 * 
 * @param index
 */
DsClient.prototype.drillDown4APIIndex = function(index) {
  if (!ds.util.isBlank(this.data.detailAPI) && this.showDetail === true) {
    var client = this;
    var detailAPI = this.getDetailAPI(index);
    var bugzillaReg = /bugzilla/;
    var isBugzillAPI = false;

    if (!ds.util.isBlank(detailAPI) && (bugzillaReg.test(detailAPI))) {
      isBugzillAPI = true;
    }

    var id = client.showDrillContainer(isBugzillAPI);

    client.detailIdRequest(detailAPI).done(function(data) {
      client.showDetailTable(id, data, isBugzillAPI);
    }).fail(function(result) {
      var description = MESSAGES.get("COMMON_ERROR_MSG");
      if (!ds.util.isBlank(result.error) && !ds.util.isBlank(result.error.description)) {
        description = result.error.description;
      }

      $(".drill-container .loader").html("<font style='color:red'>" + description + "</font>");
    });
  }

};

/**
 * this url is used to request detail ids of one api
 * 
 * @param index
 *          the index from the highchart series.options.detailAPIIndex
 * @returns {String} the request url including the host
 */
DsClient.prototype.getDetailAPI = function(index) {
  var detailAPIURI = this.data.detailAPI.apiURI;
  var commonParameters = this.data.detailAPI.commonParameters;
  var apiIndicator = this.getApiIndicator(index);
  var parameters = apiIndicator.parameters;
  var query = this.genDetailQuery(commonParameters, parameters);
  return ds.util.getApiHost(this.api) + detailAPIURI + query;
};

/**
 * return the apiIndicatro by the index in series.options.detailAPIIndex
 * 
 * @param index
 *          from series.options.detailAPIIndex
 * @returns the corresponding api indicator
 */
DsClient.prototype.getApiIndicator = function(index) {
  var apiIndicators = this.data.detailAPI.apiIndicatorIndexs;
  for (var i = 0; i < apiIndicators.length; i++) {
    if (index === apiIndicators[i].apiIndex) { return apiIndicators[i]; }
  }
};

/**
 * generate the query substring of url to show id list of this point, column etc
 * 
 * @param commonParameters
 *          from callAPI ajax data
 * @param parameters
 *          from classAPI ajax data
 * @returns {String} url query subtring
 */
DsClient.prototype.genDetailQuery = function(commonParameters, parameters) {
  var query = "";
  var paras = {};
  var count = 0;
  var paraName = "";

  // conbine commonParameters and parameters to paras
  for (paraName in commonParameters) {
    if (commonParameters.hasOwnProperty(paraName)) {
      paras[paraName] = commonParameters[paraName];
    }

  }
  ;

  // the individual parameters will override the commonParameters
  for (paraName in parameters) {
    if (parameters.hasOwnProperty(paraName)) {
      paras[paraName] = parameters[paraName];
    }
  }

  // serialize the parameters
  for (paraName in paras) {
    if (count === 0) {
      query = "?";
    } else {
      query = query + "&";
    }

    var value = paras[paraName];

    // encode all the parameter value
    if (!ds.util.isBlank(value)) {
      value = encodeURIComponent(value);
    }

    query = query + paraName + "=" + value;
    count++;
  }

  return query;
};

/**
 * get id list from the server by ajax
 * 
 * @param url
 * @returns
 */
DsClient.prototype.detailIdRequest = function(url) {
  var dfd = $.Deferred();
  $.ajax({
    dataType: "jsonp",
    url: url,
    success: function(result) {
      if (!ds.util.isBlank(result.error)) {
        dfd.reject(result);
      } else {
        dfd.resolve(result);
      }
    },
    error: function(result) {
      dfd.reject(result);
    }
  });

  return dfd.promise();
};

/**
 * diplay the drill down table container layer
 */
DsClient.prototype.showDrillContainer = function(isBugzillaAPI) {
  var date = new Date();
  var id = date.getMilliseconds();
  
  $("body").append("<div class='drill-layer' style='display:none'></div>");
  var tableContainer = $("<div class='drill-container' style='display:none'></div>");
  tableContainer.attr("id", id);
  $("body").append(tableContainer);

  // maybe we'll customize detailedPage for other classification, we can add
  // codes here,
  // furtherly,we can abstract some common functions in the future.
  if (isBugzillaAPI) {
    $('#' + id).addClass('drill-container1');
  }

  $(".drill-layer").show();
  $(".drill-container").slideDown("fast");
  $('#' + id).html("");
  $('#' + id).append('<div class="close">x</div><div class="loader">Loading...</div>');

  $(".drill-container .close").live("click", function() {
    $(".drill-container").remove();
    $(".drill-layer").remove();
  });

  return id;
};

/**
 * show id list table the client will be used in chart.jsp or other scenario so
 * the backgroun layer and table will be generated by javascript
 * 
 * @param data
 */
DsClient.prototype.showDetailTable = function(id, data, isBugzillAPI) {
  var ids = data.results;
  var redirectURL = data.itemDisplayURL;

  // maybe we'll customize detailedPage for other classification, we can add
  // codes here,
  // furtherly,we can abstract some common functions in the future.
  if (isBugzillAPI) {
    $('#' + id).addClass('drill-container1');
    var idList = '';
    var len = ids.length;
    for (var i = 0; i < len; i++) {
      var element = ids[i];
      if (i == (len - 1)) {
        idList += element;
      } else {
        idList += (element + ',');
      }
    }

    // append the whole div
    var detailHelpDiv = '<div class="bug-container">' 
            + '<p>Detailed information has been provided in Bugzilla</p>'
            + '<p class="notice-message">If no redirecting page, click the button below or check your browser\'s pop-up blocker setting</p>'
            + '<form id="bugListForm" action="https://bugzilla.redhat.com/buglist.cgi" method="post"' + 'target="_blank">'
            + '<input type="hidden" name="bug_id" value="' + idList + '"><div class="bugchoose-btn">'
            + '<button id="goBugzillaDL" type="submit" class="btn runbutton m-t">Go Bugzilla to see detail list</button>'
            + '</div></form></div>';
    $('#' + id).append(detailHelpDiv);
    // the submit action may be blocked by browser
    // so hide the loader before submit
    $(".drill-container .loader").hide();
    $('#bugListForm').submit();
  } else {
    $('#' + id).append("<h1>Detail Ids</h1>");
    if ($('#' + id).length > 0) {
      var len = ids.length;
      var colIndex = -1;
      var colLimit = 10;
      var row = "";
      var tableContent = "";

      for (var i = 0; i < len; i++) {
        var element = ids[i];
        var tdContent = "";
        colIndex++;

        if (!ds.util.isBlank(redirectURL)) {
          // changed by gli:
          // an enhancement to support multi variables url:
          // the variables value is stored in an object like
          // {"id1":"idValue1", "id2":"idValue2"} in an array,
          // and the property name will be used as replace pattern
          // and the property value will be used as replaced value.
          // For example, for test case run, its display url is like
          // https://tcms.engineering.redhat.com/run/131921/#caserun_4852576
          // so we put it like
          // https://tcms.engineering.redhat.com/run/%runId%/#caserun_%id%
          // and use the object as {"runId":123456, "id":456789}, then replace
          // the %runId% part
          // with 123456, and id part with 456789.
          // NOTE: besure that your display part must be named as "id", for
          // example,
          // for test case run one, the 456789 is used as display part, so it's
          // name is "id".
          if ((typeof element) === "object") {
            var redirURL = redirectURL;
            var idValue = 0;
            for ( var replaceVar in element) {
              if (element.hasOwnProperty(replaceVar)) {
                var replaceValue = element[replaceVar];
                redirURL = redirURL.replace("%" + replaceVar + "%", replaceValue);
                if (replaceVar === "id") {
                  idValue = replaceValue;
                }
              }
            }
            var a = "<a target='_blank' href='" + redirURL + "'>" + idValue + "</a>";
            tdContent = a;
          } else {
            // if there is only one variable in your url, you can still use the
            // normal
            // way with "id" in your url and ids in an array like [idValue1,
            // idValue2, ...]
            var redirURL = redirectURL.replace("%id%", element);
            var a = "<a target='_blank' href='" + redirURL + "'>" + element + "</a>";
            tdContent = a;
          }
        } else {
          tdContent = element;
        }

        if (colIndex === 0) {
          row = "<tr>" + row;
        }

        row = row + '<td>' + tdContent + '</td>';

        if ((colIndex === colLimit - 1) || i < colIndex || (i === (len - 1))) {
          row = row + "</tr>";
          tableContent = tableContent + row;
          row = "";
          colIndex = -1;
        }
      }

      var table = '<div class="table-container"><table class="drill-table"><tbody>'
              + tableContent + '</tbody></table></div>';
      $('#' + id).append(table);
    }
    
    $(".drill-container .loader").hide();
  }
};

/** ****************** drill down core code end ******************* */

/**
 * Call data service API by AJAX.
 * 
 * @param api
 * @param format
 */
DsClient.prototype.callAPI = function(api, settings) {
  this.deferred = $.Deferred();
  this.format = settings.defaultType || "column";
  this.init_settings = settings;
  this.showDetail = ds.util.isBlank(settings.showDetail) ? true : settings.showDetail;
  if ($.trim(api).length > 0) {
    this.buildAPI(api).done(function(client) {
      if (client.checkParameter()) {
        $.ajax({
          dataType: "json",
          url: client.api,
          context: client,
          beforeSend: client.showProgress,
          success: client.processJson,
          error: client.dealError
        });
      }
    }).fail(function(client, msg) {
      if (!ds.util.isBlank(msg)) {
        client.displayError(msg);
        $('#api').trigger('focus');
        $('#api').trigger('select');
      } else if (client.checkParameter()) {
        client.processJson(client.data);
        client.deferred.resolve(client);
      }
    });
  }
  return this.deferred.promise();
};

DsClient.prototype.displayError = function(msg) {
  this.showError4Client(msg);
  this.data = null;
  if (!ds.util.isBlank(this.chart)) {
    this.chart.destroy();
  }
};

DsClient.prototype.buildAPI = function(api) {
  var dfd = $.Deferred();
  if (this.clientool && !this.checkInternalApiUrl(api)) {
    dfd.reject(this, MESSAGES.get('EXTERNAL_URL_ERROR'));
  } else {
    var param = this.serialParameters();
    // reget the value after serialParameters if we have delelte/replace
    // operation on cloned url.
    if (this.serialParaWithRep) {
      api = $('#api').val();
    }

    var _api = "";
    if (this.clientool) {
      this.setCurrentApi(api);
    }

    if (api.indexOf('?') < 0) {
      api += '?';
    }

    if (api.indexOf('?') === (api.length - 1)) {
      _api = api + param.substring(1, param.length);
    } else {
      _api = api + param;
    }

    if (_api.indexOf('?') < 0) {
      _api += '?' + this.CALLBACK;
    } else {
      _api += '&' + this.CALLBACK;
    }

    if (this.api !== _api) {
      this.api = _api;
      dfd.resolve(this);
    } else if (ds.util.isBlank(this.data)) {
      dfd.resolve(this);
    } else {
      dfd.reject(this);
    }
  }
  return dfd.promise();
};

DsClient.prototype.getParaInputValue = function(paraName) {
  var value = "";
  var client = this;

  if (!ds.util.isBlank(paraName)) {
    var para = this.getParaByName(this.currentApi.parameters, paraName);
    var paraId = para.id;
    var i = $("div[paraId='" + paraId + "']").attr("index");
    var type = $('#parameter_value' + i).attr("paratype");
    var encoded = this.getPara4Id(paraId).encoded;
    var component = this.getComponetByIndex(i);

    /** ***************** get parameter value start ****************** */
    // this condition used for non-date parameter
    if (ds.util.isBlank(component)) {
      if (type === 'people') {
        value = $("input[name='parameter_value" + i + "']").val();
        value = value.replace(/"/g, "");
        value = (value === '[]') ? '' : value;
      } else {
        value = $('#parameter_value' + i).val();
      }

      if (!ds.util.isBlank(value) && encoded) {
        value = client.encodeParaValue(value);
      }
      // else condition used for compoents
    } else {
      value = component.getValue();
    }
  }

  return value;
};

/**
 * Get all the parameters values, then integerate them to url
 * 
 * @returns {String}
 */
DsClient.prototype.serialParameters = function() {
  var client = this;
  var url = '';
  var paraId = -1;
  this.paramertChecKList = [];
  for (var i = 0; i < this.index; i++) {
    var name = '';
    var value = '';

    if (($('#parameter_name' + i).length > 0) && ($('#parameter_value' + i).length > 0)) {
      name = ds.util.lowerFirstChar($('#parameter_name' + i + '>p').text());
      paraId = $('#parameter_name' + i).attr("paraId");
      value = this.getParaValue(paraId);
      client.delDuplicateParamInAPIInput({
        'name': name,
        'value': value
      });

      client.paramertChecKList.push({
        'name': name,
        'value': value
      });

      // check the value real value
      if ($.trim(name).length > 0 && $.trim(value).length > 0) {
        url += '&' + name + '=' + value;
      }
    }
  }

  return url;
};

/**
 * Encode the parameter value from client input/select, 1. encode the whole of a
 * string input value 2. encode the value of Array element
 * 
 * @param paraValue
 *          input value, will be String/Array
 * @returns the encoded value
 */
DsClient.prototype.encodeParaValue = function(paraValue) {
  if ($.isArray(paraValue) === true) {
    for (var i = 0; i < paraValue.length; i++) {
      paraValue[i] = encodeURIComponent(paraValue[i]);
    }

  } else {
    paraValue = encodeURIComponent(paraValue);
    paraValue = paraValue.replace(/%5B/g, "[");
    paraValue = paraValue.replace(/%5D/g, "]");
    paraValue = paraValue.replace(/%7B/g, "{");
    paraValue = paraValue.replace(/%7D/g, "}");
    paraValue = paraValue.replace(/%2C/g, ",");
    paraValue = paraValue.replace(/%3A/g, ":");
    // do not replace !, because ! is the same when encoded
  }

  return paraValue;
};

/**
 * Decode the parameter value from cloned api, 1. decode the whole of a string
 * input value 2. decode the value of Array element
 * 
 * @param paraValue
 *          input value, will be String/Array
 * @returns the decoded value
 */
DsClient.prototype.decodeParaValue = function(paraValue) {
  if ($.isArray(paraValue) === true) {
    for (var i = 0; i < paraValue.length; i++) {
      paraValue[i] = decodeURIComponent(paraValue[i]);
    }

  } else {
    paraValue = decodeURIComponent(paraValue);
  }

  return paraValue;
};

/**
 * Process JSON response from data service API.
 * 
 * @param data
 */
DsClient.prototype.processJson = function(data) {
  var client = this;
  this.data = data;
  if (!ds.util.isBlank(data.error)) {
    var msg = data.error.description || MESSAGES.get("COMMON_ERROR_MSG");
    this.showError4Client(msg);
    this.deferred.reject(this);
    return void 0;
  } else if (ds.util.isBlank(data.highchart)) {
    var msg = MESSAGES.get("NO_HIGHCHART_MSG");
    this.showError4Client(msg);
    this.deferred.reject(this);
    return void 0;
  } else {
    // set the default type of the chart
    if (this.format !== "table") {
      this.format = data.highchart.type || this.format;
    }

    this.defaultReportType = this.format;

    // customize settng will cover original settings
    this.format = (this.init_settings && this.init_settings.format) || this.format;

    client.genReport(data);

    // leave out the background image of the data picture container
    $('#container').css("background", "none");
    $("#" + this.reportdiv).find('#progress').hide();
    this.deferred.resolve(this);
  }
};

/**
 * Client generate the related report
 * 
 * @param data
 */
DsClient.prototype.genReport = function(data) {
  var client = this;
  var format = this.format;
  if (format === "table") {
    client.drawTable(data);
  } else {
    client.drawChart(data);
  }
};

/**
 * This the entrance for drawing highchart
 * 
 * @param data
 *          the api returned
 */
DsClient.prototype.drawChart = function(data) {
  // reset the highchart options
  this.initOptions(data);
  // set the type of the chart
  if (data.report === 'both' || data.report === 'chart') {
    if (this.format === this.STACK) {
      this.options.chart.type = this.COLUMN;
      this.options.plotOptions.column.stacking = 'normal';
    } else {
      this.options.chart.type = this.format;
    }

    this.options.xAxis.categories = [];

    // change to use $.extend to protect the original
    // data.highchart.categories
    $.extend(true, this.options.xAxis.categories, data.highchart.categories);

    this.options.series = [];
    // change to use $.extend to protect the original
    // data.highchart.series
    $.extend(true, this.options.series, data.highchart.series);

    // make string value data do not display in chart
    if (!this.isPieDataStructure()) {
      for (var i = 0; i < this.options.series.length; i++) {
        this.options.series[i].showInLegend = $.isNumeric(this.options.series[i].data[0]);
        this.options.series[i].visible = $.isNumeric(this.options.series[i].data[0]);
      }
    } else {
      this.options.series[0].showInLegend = true;
      this.options.series[0].visible = true;
      for (var i = 0; i < this.options.series[0].data.length; i++) {
        this.options.series[0].data[i].showInLegend = $.isNumeric(this.options.series[0].data[i].y);
        this.options.series[0].data[i].visible = $.isNumeric(this.options.series[0].data[i].y);
      }
    }

    // set the type of the serie
    this.options.plotOptions.column.stacking = '';
    for (var i = 0; i < this.options.series.length; i++) {
      if (this.format === this.STACK) {
        this.options.series[i].type = this.COLUMN;
        this.options.plotOptions.column.stacking = 'normal';
      } else {
        this.options.series[i].type = this.format;
      }
    }

    this.initChartDefaultSetting(this.options);

    // customize the options by the input settings
    if (!ds.util.isBlank(this.init_settings)) {
      this.customizeSetting(this.options, this.init_settings);
    }

    // add auto xAxis steps
    var drawOptions = this.addChartStep(this.options);

    $("#" + this.reportdiv).html("");
    this.chart = new Highcharts.Chart(drawOptions);
  } else {
    $('#' + this.reportdiv).html("<div style='margin:10px auto;'>" + MESSAGES.get('CHART_SUPPORT_ERROR') + "</div>");
    $('#' + this.reportdiv).addClass('alert alert-error');
  }

  if (data.report === 'both' || data.report === 'tree') {
    this.showResult(data.results);
  }

  $('#Advance_Setting').fadeIn(500);
  this.initChartSetting();
};

/**
 * Add step to xAxis when categories number is large, will also hide the
 * datalables
 * 
 * @param options
 * @returns options
 */
DsClient.prototype.addChartStep = function(originalOptions) {
  var options = {};
  $.extend(true, options, originalOptions);
  var charLen = 70;
  var len = options.xAxis.categories.length;
  var chartType = options.chart.type;
  var labelIndex = 0;
  var step = 1;
  var xAxisWidth = $("#" + this.reportdiv).width() * 0.96;
  var targetCateNum = Math.floor(xAxisWidth / charLen);
  targetCateNum = (targetCateNum === 0) ? 1 : targetCateNum;

  if (len > (targetCateNum * 0.95)) {
    options.plotOptions.series.marker.enabled = false;
    options.plotOptions.series.dataLabels.enabled = false;
  }
  
  if (len > targetCateNum) {
    step = Math.ceil(len / targetCateNum);
    
    options.xAxis.labels.formatter = function() {
      if (this.isFirst) {
        labelIndex = 0;
      };

      if (this.isFirst || (labelIndex % step === 0)) {
        labelIndex++;
        return this.value;
      } else {
        labelIndex++;
        return "";
      }
    };
    
    options.chart.marginRight = charLen / 2;
  }
  
  var displayCategories = $.map(options.xAxis.categories, function(element, index) {
    if ((index % step) === 0) {
      return element;
    } else {
      return "";
    }
  });
  
  var charMaxCharNum = Math.max.apply(displayCategories, $.map(displayCategories, function(el) {
    return el.length;
  }));

  if (charMaxCharNum > 30 && (chartType !== "bar") && (chartType !== "pie")) {
    var lines = Math.ceil(charMaxCharNum / 25);
    var h = 15 * lines;
    var d = xAxisWidth / targetCateNum;
    var sinValue = (h < d) ? (h / d) : 1;
    
    var degree = Math.asin(sinValue) * 180 / Math.PI;
    options.xAxis.labels.rotation = -degree;
    
    if(options.xAxis.categories.length > 5) {
      var firstWidth = options.xAxis.categories[0].length * 8;
      var stepWidth =  $("#" + this.reportdiv).width()/len/2;
      var marginLeft = firstWidth - stepWidth;
      marginLeft = (marginLeft > 0) ? marginLeft : 0; 
      options.chart.marginLeft = marginLeft;
    }
    
    options.xAxis.labels.style = {
      width: 180
    };
  }

  return options;
};

/**
 * Draw the table report
 */
DsClient.prototype.drawTable = function() {
  this.clientOptions = TableSetting.getInstance(this);
  this.clientOptions.init();

  if (this.clientool) {
    // the show result is related to client, it is related client's interaction
    // it will be moved to ds-client-action in the future
    this.showResult(this.data.results);
  }
};

DsClient.prototype.dealError = function(xhr, s) {
  var errorMsg = MESSAGES.get('SERVER_ERROR');
  if (504 === xhr.status) {
    errorMsg = MESSAGES.get('TIMEOUT_ERROR');
  } else {
    try {
      var result = JSON.parse(xhr.responseText);
      if (!ds.util.isBlank(result.error)) {
        errorMsg = result.error.description || errorMsg;
      }
    } catch (e) {
    }
  }
  this.displayError(errorMsg);
  this.deferred.reject(this);
};

/**
 * Show the error message in the chart container
 * 
 * @param errorMsg
 */
DsClient.prototype.showError4Client = function(errorMsg) {
  var msg = errorMsg || MESSAGES.get('SERVER_ERROR');
  $('#' + this.reportdiv).html("<div style='margin:10px auto;'>" + msg + "</div>");
  $('#' + this.reportdiv).addClass('alert alert-error');
};

DsClient.prototype.showProgress = function(xhr, s) {
  var pro = $('<div class="progress progress-striped active" id="progress"><div class="bar" style="width: 0%;"></div></div>');
  $('#' + this.reportdiv).html(pro);
  $('#' + this.reportdiv).find(".bar").animate({
    "width": "90%"
  }, 5000, null);
};

DsClient.prototype.getRequiredPara = function() {
  var p_required = [];

  var api = $.trim($('#api').val());
  this.setCurrentApi(api);

  if (this.editableAPI) { return p_required; }

  if (!ds.util.isBlank(this.currentApi) && !ds.util.isBlank(this.currentApi.parameters)) {
    for (var i = 0; i < this.currentApi.parameters.length; i++) {
      var p = this.currentApi.parameters[i];
      if (p.required === 'Y') {
        p_required.push(p);
      }
    }
  }

  return p_required;
};

DsClient.prototype.getAllPara = function() {
  var api = $.trim($('#api').val());
  this.setCurrentApi(api);

  if (this.editableAPI) { return []; }

  if (!ds.util.isBlank(this.currentApi) && !ds.util.isBlank(this.currentApi.parameters)) { return this.currentApi.parameters; }

  return [];
};

DsClient.prototype.getDefaultType = function() {
  var api = $.trim($('#api').val());
  this.setCurrentApi(api);

  if (this.editableAPI) { return ""; }

  if (!ds.util.isBlank(this.currentApi) && !ds.util.isBlank(this.currentApi.defaultType)) { return this.currentApi.defaultType; }

  return "";
};

DsClient.prototype.getEitherPara = function() {
  var p_either = [];

  var api = $.trim($('#api').val());
  this.setCurrentApi(api);

  if (this.editableAPI) { return p_either; }

  if (!ds.util.isBlank(this.currentApi) && !ds.util.isBlank(this.currentApi.parameters)) {
    for (var i = 0; i < this.currentApi.parameters.length; i++) {
      var p = this.currentApi.parameters[i];
      if (p.required === 'E') {
        p_either.push(p);
      }
    }
  }

  return p_either;
};

DsClient.prototype.getParaName = function(paras) {
  var p_name = [];
  for (var i = 0; i < paras.length; i++) {
    p_name.push(paras[i].name);
  }

  return p_name;
};

/*******************************************************************************
 * renderFlag is Boolean. this pointed addParameter with given value or not.
 ******************************************************************************/
DsClient.prototype.addParameter = function(paraId, requiredObj, renderFlag) {
  var api = $.trim($('#api').val());

  this.setCurrentApi(api);
  if (!this.editableAPI) {
    var i = this.index++;
    if (api.length <= 0) {
      $('#api').addClass('input-error');
      $('#api').focus();
    } else if (api.length > 0 && !ds.util.isBlank(this.currentApi)) {
      var group = requiredObj.requiredArray[i];
      var isRequired = group !== undefined;
      var isGrouped = group !== -1;
      var _para = '<div class="parameterline" index=' + i + ' id="para' + i + '">' + '<div index=' + i + ' id="parameter_name'
              + i + '" name="parameter_name' + i + '" class="parameter-name"' + ' paraId="' + paraId + '" isRequired="'
              + isRequired + '"' + (isRequired ? (' group="' + group + '"') : '') + ' ><p>'
              + ds.util.upperFirstChar(this.getParaName4Id(paraId)) + '</p>'
              + (isRequired ? '<em class="' + (isGrouped ? 'green' : 'red') + '">*</em>' : '') + '</div>'
              + '<div class="para-container" id="value_' + i + '">' + '</div>' + '<div class="clear"></div>' + '</div>';

      $('#parameter').append(_para);

      paraId = $('#parameter_name' + i).attr("paraId");
      this.getParameterValue(paraId, i, renderFlag);
    }
  } else {
    alert(MESSAGES.get('EDITABLE_API_ADD_PARAMETER_ERROR'));
  }
};

DsClient.prototype.removeParameter = function(id) {
  $('#' + id).remove();
};

DsClient.prototype.showResult = function(json) {
  var jsonStr = JSON.stringify(json, null, '\t');
  $('#' + this.datadiv).val(jsonStr);
  $('#' + this.datadiv).css('height', '200px');
  $('#data-handlebar img').attr("src", "resources/images/triangle4.png");
};

DsClient.prototype.showResultURL = function(json) {
  if ($('#resulturl').length !== 0) {
    var api = this.api.substring(0, this.api.lastIndexOf('&callback=?'));

    if (api[api.length - 1] === '?') {
      api = api.substring(0, api.length - 1);
    }

    this.setCurrentApi(api);

    $('#resulturl').attr("apiId", this.currentApi.id);
    $('#url-output-input').val(api);
  }
};

/**
 * re-generate the highchart chart by advance setting.
 */
DsClient.prototype.reGenerateChart = function() {
  var i = 0;

  if (this.data.report === 'both' || this.data.report === 'chart') {
    // get the chart type from the advanced setting
    this.format = this.clientOptions.getChartType();
    this.options.plotOptions.column.stacking = '';

    if (this.format === this.STACK) {
      this.options.chart.type = this.COLUMN;
      this.options.plotOptions.column.stacking = 'normal';
    } else {
      this.options.chart.type = this.format;
    }

    this.options.xAxis.categories = this.clientOptions.getxAxis();

    this.options.yAxis = [];
    for (i = 0; i < this.clientOptions.getyAxis().length; i++) {
      var yaxis = this.clientOptions.getyAxis()[i];
      // if (yaxis.enabled === 'true') {
      // var y = {
      // labels : {
      // format : '{value}' + yaxis.unit
      // },
      // title : {
      // text : yaxis.title
      // }
      // };
      // if (i === this.clientOptions.getyAxis().length - 1) {
      // y.opposite = true;
      // }
      // this.options.yAxis.push(y);
      // }
      var y = {
        labels: {
          format: ''
        },
        title: {
          text: ''
        },
        min: 0
      };
      if (yaxis.enabled === 'true') {
        y.labels = {
          format: '{value}' + yaxis.unit
        };
        y.title = {
          text: yaxis.title
        };
        if (i === 1) {
          y.opposite = true;
        }
      } else if (yaxis.enabled === 'false') {
        if (i === 0) {
          y.opposite = true;
        }
      }

      this.options.yAxis.push(y);
    }

    for (i = 0; i < this.clientOptions.getSeries().length; i++) {
      var s = this.clientOptions.getSeries()[i];
      for (var j = 0; j < this.options.series.length; j++) {
        if (parseInt(s.oldname) === j) {
          this.options.series[j].name = s.name;
          this.options.series[j].type = s.type;
          this.options.series[j].yAxis = parseInt(s.belongsto);
          this.options.series[j].dashStyle = s.lineStyle;

          // make string value data do not display in chart
          if (!this.isPieDataStructure()) {
            this.options.series[j].color = s.color;
            this.options.series[j].borderColor = s.borderColor;
            this.options.series[j].showInLegend = $.isNumeric(this.options.series[j].data[0]);
            this.options.series[j].visible = $.isNumeric(this.options.series[j].data[0]);
          } else {
            this.options.series[j].color = void 0;
            this.options.series[j].borderColor = void 0;
            this.options.series[j].showInLegend = true;
            this.options.series[j].visible = true;
          }

          break;
        }
      }
    }

    // apply pie data settings
    var pieData = this.clientOptions.getPieData();
    var data = this.options.series[0].data;
    if ($.isArray(data) && (!ds.util.isBlank(data[0].name))) {
      for (var i = 0; i < data.length; i++) {
        $.extend(true, this.options.series[0].data[i], pieData[i]);
      }
    }

    this.options.title.text = _.escape(this.clientOptions.getTitle());
    this.options.subtitle.text = _.escape(this.clientOptions.getSubTitle());

    try {
      // add auto xAxis steps
      var drawOptions = this.addChartStep(this.options);
      this.chart = new Highcharts.Chart(drawOptions);
    } catch (e) {
      $('#' + this.reportdiv).html("<div style='margin:10px auto;'>" + MESSAGES.get('CHART_GENERATE_ERROR') + "</div>");
      $('#' + this.reportdiv).addClass('alert alert-error');
    }
  } else {
    $('#' + this.reportdiv).html("<div style='margin:10px auto;'>" + MESSAGES.get('CHART_SUPPORT_ERROR') + "</div>");
    $('#' + this.reportdiv).addClass('alert alert-error');
  }
};

DsClient.prototype.initChartSetting = function() {
  if (this.clientool) {
    this.clientOptions = ChartSetting.getInstance(this);
    this.clientOptions.init();
  }
};

/**
 * init all api value in client
 * 
 * @returns jquery deferred object
 */
DsClient.prototype.initApi = function() {
  var client = this;
  var dfd = $.Deferred();

  client.getAllApi().done(
          function(data) {
            client.apis = [];

            for (var i = 0; i < data.views.length; i++) {
              var api = new Api(data.views[i].id, client.API_HOST + data.views[i].name, data.views[i].pageid,
                      data.views[i].classification, data.views[i].defaultType, data.views[i].img, data.views[i].description);
              for (var j = 0; j < data.views[i].parameters.length; j++) {
                var p = data.views[i].parameters[j];
                api.parameters.push(new Parameter(p));
              }

              client.apis.push(api);
            }

            dfd.resolve();
          });

  return dfd.promise();
};

/**
 * get all api information from ajax
 * 
 * @returns jquery deferred object
 */
DsClient.prototype.getAllApi = function() {
  var dfd = $.Deferred();
  $('#api').attr("disabled", "disabled");
  $.ajax({
    dataType: "json",
    url: this.API_URL,
    context: this,
    success: function(result) {
      if (!ds.util.isBlank(result.error)) {
        ds.util.errorHandler(result.error);
        dfd.reject(result);
      } else {
        dfd.resolve(result);
      }
    }
  });
  return dfd.promise();
};

/**
 * get the needed api information from ajax
 * 
 * @returns jquery deferred object
 */
DsClient.prototype.getRestApiByName = function(apiName) {
  var dfd = $.Deferred();
  $('#api').attr("disabled", "disabled");
  $.ajax({
    async: false,
    dataType: "json",
    url: this.POINTED_API + apiName,
    context: this,
    success: function(result) {
      if (!ds.util.isBlank(result.error)) {
        ds.util.errorHandler(result.error);
        dfd.reject(result);
      } else {
        dfd.resolve(result);
      }
    }
  });
  return dfd.promise();
};

DsClient.prototype.prepareAPIinClient = function(apiFullUrl) {
  var dfd = $.Deferred();

  var client = this;
  var apiName = ds.util.getAPINameByFullUrl(apiFullUrl);
  // check if in this.apis ;
  for (var k = 0; k < this.apis.length; k++) {
    var targetApiName = client.API_HOST + apiName;
    if (this.apis[k].name === targetApiName) {
      dfd.resolve();
      return dfd.promise();
    }
  }

  this.getRestApiByName(apiName).done(
          function(data) {
            for (var i = 0; i < data.views.length; i++) {
              var api = new Api(data.views[i].id, client.API_HOST + data.views[i].name, data.views[i].pageid,
                      data.views[i].classification, data.views[i].defaultType, data.views[i].img, data.views[i].description);
              for (var j = 0; j < data.views[i].parameters.length; j++) {
                var p = data.views[i].parameters[j];
                api.parameters.push(new Parameter(p));
              }

              client.apis.push(api);
            }

            dfd.resolve();
          }).fail(function() {
    dfd.reject();
  });

  return dfd.promise();
};

/**
 * this method is corresponding to the input box in client
 * 
 * @param data
 *          the apis json object
 */
DsClient.prototype.renderApiInput = function(data) {
  if (this.clientool) {
    var data_source = [];
    for (var i = 0; i < this.apis.length; i++) {
      data_source.push(this.apis[i].name);
    }

    $("#api").typeahead({
      minLength: 0,
      items: 9999,
      source: data_source
    });

    $("#api").on('focus', $("#api").typeahead.bind($("#api"), 'lookup'));

    $('#api').removeAttr("disabled");

    var client = this;

    // keep the formal input mode.
    $("#api").bind("change input", function() {
      var cloneMode = false;
      var renderFlag = false;
      client.components = {};
      client.clonedAPIParamsMap = [];
      client.willRemoveParamsOfClonedAPI = [];
      $("#Advance_Setting").hide();
      client.apiChangeHandler(cloneMode, renderFlag);
    });

    client.initChartTemplate();
    client.initOrUpdateUsedAPIsTemplate();
  }
};

DsClient.prototype.apiChangeHandler = function(cloneMode, renderFlag) {
  var client = this;
  renderFlag = renderFlag || false;
  client.cloneMode = cloneMode || false;
  
  $("#api-description-container").hide();
  $("#parameter").html("");
  $("#para-title").hide();
  $("#doc-link").hide();
  $(".run-btn-first-container").hide();
  $('#adv-button-direction').remove();
  $('#adv-button-arrow').remove();
  $("#Settings").css({
    'z-index': "auto",
    'position': "static"
  });
  $(".template-btn.activate").removeClass("activate");
  $(".chart-control.chart-control-choose").removeClass("chart-control-choose");

  client.index = 0;
  var allPara = client.getAllPara();
  client.bindUpdateEvent(allPara);

  var defaultType = client.getDefaultType() || "";
  if (defaultType !== "") {
    $("#api").attr("defaultType", defaultType);
  } else {
    $("#api").attr("defaultType", "column");
  }

  if (allPara.length > 0) {
    $("#para-title").show();
    $("#doc-link").show();

    var classification = client.currentApi.classification;
    var apiName = client.currentApi.name;

    $("[classification=" + classification + "]").addClass("activate");
    $(".chart-control[api='" + apiName + "']").addClass("chart-control-choose");
    var requiredObj = client.checkRequired(allPara);
    for (var i = 0; i < allPara.length; i++) {
      client.addParameter(allPara[i].id, requiredObj, renderFlag);
    }

    if (allPara.length > 10) {
      $(".run-btn-first-container").show();
    }

  } else {
    client.currentApi = null;
  }

  client.addAPIDocLink(client.currentApi);
  var description = client.currentApi.description || "";
  client.addDescription(description);
};

/**
 * Add documention link near parameters '?'
 */
DsClient.prototype.addAPIDocLink = function(currentApi) {
  var $docLink = $("#doc-link");
  if (!ds.util.isBlank(currentApi) && !ds.util.isBlank(currentApi.pageid) && (currentApi.pageid !== "")) {
    var link = "https://docs.engineering.redhat.com/pages/viewpage.action?pageId=" + currentApi.pageid;
    $docLink.attr("href", link);
  } else {
    $docLink.hide();
  }
};

/**
 * Add description to api input
 */
DsClient.prototype.addDescription = function(description) {
  description = description || "";
  if (description !== "") {
    $("#api-description-container").show();
    $("#api-description").text(description);
  } else {
    $("#api-description-container").hide();
    $("#api-description").text("");
  }
};

DsClient.prototype.renderClonedParams = function() {
  var client = this;
  var cloneMode = true;
  var renderFlag = true;
  
  client.components = {};
  client.clonedAPIParamsMap = [];
  client.willRemoveParamsOfClonedAPI = [];
  
  //parse cloned API params Name-Value array.
  client.parseClonedAPIParams();
  client.apiChangeHandler(cloneMode, renderFlag);
};

DsClient.prototype.checkRequired = function(allPara) {
  var array = [];
  var groupArray = [];
  for (var i = 0; i < allPara.length; i++) {
    var param = allPara[i];
    if (param.required === 'E' || param.required === 'Y') {
      groupArray[param.requiredGroup] === undefined ? groupArray[param.requiredGroup] = [i] : groupArray[param.requiredGroup]
              .push(i);
      array[i] = param.requiredGroup;
    }
  }
  for (var i = 0; i < groupArray.length; i++) {
    groupArray[i] !== undefined && groupArray[i].length === 1 ? array[groupArray[i][0]] = -1 : null;
  }
  return {
    requiredArray: array,
    groupArray: groupArray
  };
};

/**
 * will return the api detail by apiName
 * 
 * @param apiName
 * @returns api detail object
 */
DsClient.prototype.getAPIByName = function(apiName) {
  if (!ds.util.isBlank(this.apis) && this.apis.length > 0) {
    for (var i = 0; i < this.apis.length; i++) {
      if (apiName === this.apis[i].name) { return this.apis[i]; }
    }
  }
};

/**
 * will return the api detail by API id
 * 
 * @param apiId
 * @returns api detail object
 */
DsClient.prototype.getAPIById = function(apiId) {
  if (!ds.util.isBlank(this.apis) && this.apis.length > 0) {
    for (var i = 0; i < this.apis.length; i++) {
      if (apiId === this.apis[i].id) { return this.apis[i]; }
    }
  }
};

DsClient.prototype.getParameterSelect = function(paraId) {
  var option = '';
  for (var j = 0; j < this.currentApi.parameters.length; j++) {
    option = option + "<option " + "paraId='" + this.currentApi.parameters[j].id + "' ";
    if (parseInt(this.currentApi.parameters[j].id) === parseInt(paraId)) {
      option += "selected='selected'";
    }
    option += " value='" + this.currentApi.parameters[j].name + "'>" + this.currentApi.parameters[j].name + "</option>";
  }
  return option;
};

DsClient.prototype.bindUpdateEvent = function(paras) {
  var client = this;
  client.eventMap = {};

  if (!ds.util.isBlank(paras) && paras.length > 0) {
    var length = paras.length;
    for (var i = 0; i < length; i++) {
      var paraId = paras[i].id;
      var parentId = paras[i].parentId;
      if (parseInt(parentId) !== 0) {
        client.eventMap[parentId.toString()] = client.eventMap[parentId.toString()] || [];
        var ele = {};
        ele.paraId = paraId;
        ele.index = i;
        client.eventMap[parentId.toString()].push(ele);
        $("body").unbind(parentId.toString());
        $("body").bind(parentId.toString(), function(event, parentId, renderFlag) {
          var children = client.eventMap[parentId.toString()] || [];
          for (var i = 0; i < children.length; i++) {
            var ele = children[i];
            client.getParameterValue(ele.paraId, ele.index, renderFlag);
          }
        });
      }
    }
  }

};

DsClient.prototype.getParameterValue = function(paraId, i, renderFlag) {
  var dfd = $.Deferred();
  var api = $.trim($('#api').val());
  this.setCurrentApi(api);
  var client = this;

  var value = '';
  var dateRegEx = /(^date$)|(^date\|)/;

  var para = this.getPara4Id(parseInt(paraId));
  var param_name = para.name || "";
  var parentId = para.parentId;

  var encoded = para.encoded || false;
  var renderable = false;
  var clonePValue = "";
  var componentsMap = {
    'select': SingleSelect,
    'multiple': MultiSelector,
    'multiple:N': MultiSelector,
    'multi-or-and': OrAndMultiple,
    'include': IncludeExcludeMultiple,
    'groupBy': GroupBy,
    'multiGroup': MultiGroupSelect,
    'period': PeriodTimeSelect,
    'period:date': PeriodDateSelect
  };

  if (renderFlag) {
    clonePValue = client.getClonedParamValueByName(param_name);
  }

  var helpLink = client.genHelpLink(client.helpLinkURL, para);

  if (dateRegEx.test(para.type)) {
    this.getSelectdata(para).done(function(result) {
      var dateComponent = DateParamComponent.getInstance(para);
      client.registerComponent(dateComponent);
      if (dateComponent.generate(i, helpLink, result.data, clonePValue)) {
        if (renderFlag) {
          client.willRemoveParamsOfClonedAPI.push(param_name);
          client.appendUnRemovedParams();
        }

        dfd.resolve();
      } else {
        dfd.reject({
          msg: MESSAGES.get('RENDER_DATE_PARAM_ERROR')
        });
      }
      ;
    }).fail(function() {
      dfd.reject();
    }).progress(function() {
      $('#value_' + i).html("<span class='loading'>" + MESSAGES.get('PARAMETER_VALUE_LOAD_MESSAGE') + "</span>");
      dfd.notify();
    });
  } else if (para.type === 'datePoint') {
    if (!ds.util.isBlank(clonePValue)) {
      renderable = true;
      if (encoded) {
        clonePValue = client.decodeParaValue(clonePValue);
      }
    }

    value = '<div class="inline-block datepoint-container">' 
            + '<input type="text" readonly="readonly" id="parameter_value' + i + '"' + ' name="parameter_value' + i + '" class="date-input-box" placeholder="'
            + (para.description || "") + '" />' 
            + '<div id="parameter_value_clean_button_' + i + '" class="clean-button">-</div>'
            + '</div>';

    value = this.appendHelpLinkCheck(value, this.helpLinkURL, para);
    $('#value_' + i).html(value);
    if (this.helpLinkURLCheck(this.helpLinkURL, para)) {
      $('#value_' + i).css("position", "relative");
    }

    ds.util.datepicker($("#parameter_value" + i), "daily");
    
    $('#parameter_value_clean_button_' + i).click(function() {
      $("#parameter_value" + i).attr('value', '');
      $("#parameter_value" + i).datepicker("option", {
        minDate: null,
        maxDate: null
      });
    });

    if (renderFlag && renderable) {
      $("#parameter_value" + i).val(clonePValue);
      client.willRemoveParamsOfClonedAPI.push(param_name);
      client.appendUnRemovedParams();
      dfd.resolve();
    } else {
      if (renderable) {
        dfd.reject({
          msg: MESSAGES.get('RENDER_SELECT_PARAM_ERROR')
        });
      } else {
        dfd.reject();
      }
    }
  } else if (!ds.util.isBlank(componentsMap[para.type])) {
    client = this;
    parentId = para.parentId;
    var cloneValue = client.getClonedParamValueByName(param_name);

    if (parseInt(parentId) !== 0) {
      $("#parameter_name" + i).attr("parentId", parentId);
    }

    client.getSelectdata(para).done(function(result) {
      var helpLink = client.genHelpLink(client.helpLinkURL, para);
      var optionDataArr = result.data;
      var multiSelector = {};
      multiSelector = componentsMap[para.type].getInstance(para, client);
      client.registerComponent(multiSelector);

      if (multiSelector.generate(i, helpLink, optionDataArr, cloneValue)) {
        $("body").trigger(para.id.toString(), [paraId, renderFlag]);

        multiSelector.change(function(component) {
          var paraId = (component && component.para && component.para.id) || -1;
          if (client.isParent(paraId)) {
            $("body").trigger(paraId.toString(), [paraId, renderFlag]);
          }
        });

        if (renderFlag) {
          client.willRemoveParamsOfClonedAPI.push(param_name);
          client.appendUnRemovedParams();
        }

        dfd.resolve();
      } else {
        dfd.reject({
          msg: MESSAGES.get('RENDER_PARAM_ERROR_PREFIX') + para.type + MESSAGES.get('RENDER_PARAM_ERROR_SUFFIX')
        });
      }
    }).fail(
            function(data) {
              if (ds.util.isBlank(data)) {
                $('#value_' + i).html("<span class='loading'>" + MESSAGES.get('COMMON_ERROR_MSG') + "</span>");
                dfd.reject();
              } else {
                $('#value_' + i).html(
                        '<input class="template-input parameters-input" placeholder="'
                                + MESSAGES.get('NO_PARENT_MSG').replace('%parent%', data.parentName)
                                + '" disabled="disabled" />');
              }
            }).progress(function() {
      $('#value_' + i).html("<span class='loading'>" + MESSAGES.get('PARAMETER_VALUE_LOAD_MESSAGE') + "</span>");
      dfd.notify();
    });

  } else if (para.type === 'people') {
    var description = para.description || "";

    value = '<textarea id="parameter_value' + i + '"' + ' class="parameters-input template-input" name="parameter_value' + i
            + '" rows="1" placeholder="' + description + '" paraType="people"></textarea>';

    value = this.appendHelpLinkCheck(value, this.helpLinkURL, para);
    $('#value_' + i).html(value);

    if (client.helpLinkURLCheck(client.helpLinkURL, para)) {
      $('#value_' + i).css("position", "relative");
      $('#parameter_value' + i).css("width", $('#parameter').width() * 0.72);
    } else {
      $('#parameter_value' + i).css("width", $('#parameter').width() * 0.77);
    }

    // textext plugin codes
    $('#parameter_value' + i).textext({
      plugins: 'tags autocomplete ajax prompt',
      prompt: description,
      autocomplete: {
        render: function(suggestion) {
          var renderHtml;
          if (suggestion.indexOf('@') > 0) {
            renderHtml = suggestion + '<span style="float:right">bugzilla-email</span>';
          } else {
            renderHtml = suggestion + '<span style="float:right">ldap-group</span>';
          }
          return renderHtml;
        }
      },
      ajax: {
        loadingDelay: 0.1,
        typeDelay: 1,
        url: client.PEOPLE_SEARCH_API,
        dataType: 'json',
        'dataCallback': function(query) {
          return {
            'search': query,
            parameterId: para.id
          };
        }
      },
      ext: {
        ajax: {
          onGetSuggestions: function(e, data) {
            var query = (data || {}).query || '';
            if (!ds.util.isBlank(query) && (query != '') && query.length > 1) {
              return $.fn.textext.TextExtAjax.prototype.onGetSuggestions.apply(this, arguments);
            } else {
              return;
            }

          }
        },
        prompt: {
          onBlur: function(e) {
            var self = this;

            if (self.core().tags().tagElements().length > 0) {
              return;
            } else {
              return $.fn.textext.TextExtPrompt.prototype.onBlur.apply(this, arguments);
            }
          }
        },
        tags: {
          REGEXP: /[,;\t\s\n]+/,
          isTagAllowed: function(tag) {
            var result = !tag.match(this.REGEXP);
            var opts = {
              tag: tag,
              result: result
            };
            // this.trigger(EVENT_IS_TAG_ALLOWED, opts);
            return opts.result === true;
          },
          onEnterKeyPress: function(e, noFocus) {
            var self = this, val = self.val(), vals = val.split(self.REGEXP), tags = [];
            for ( var i in vals) {
              var tag = self.itemManager().stringToItem(vals[i]);
              tags.push(tag);
            }
            self.addTags(tags);
            if (!noFocus) {
              // refocus the textarea just in case it lost the
              // focus
              self.core().focusInput();
            }
          },
          onGetFormData: function(e, data, keyCode) {
            var self = this, inputValue = keyCode === 13 ? '' : self.val();
            if ((keyCode === 188 || keyCode === 186 || keyCode === 32 || keyCode === 59) && inputValue.match(/.*[,;\n\s\t]$/)) {
              self.trigger('enterKeyPress');
              inputValue = '';
            }
            data[200] = self.formDataObject(inputValue, self._formData);
          }
        },
        core: {
          serializeData: function(item) {
            for ( var index in item) {
              item[index] = $.trim(item[index].toString());
            }

            return $.fn.textext.TextExt.prototype.serializeData.apply(this, arguments);
          }
        }
      }
    }).bind('paste focusout', function(e) {
      var ele = this, type = e.type;
      window.setTimeout(function() {
        if (ele.value !== '') {
          $(ele).trigger('enterKeyPress', type === 'focusout');
          ele.value = '';
        }
      }, 1);
    });

    if (client.helpLinkURLCheck(client.helpLinkURL, para)) { 
      $('.text-core').addClass("add-on");
    }
    
    $('.text-core').addClass("parameters-input");
    $('.text-core').addClass("template-input");

    var clonePValue = '';
    var renderable = false;
    if (renderFlag) {
      clonePValue = client.getClonedParamValueByName(param_name);
      if (!ds.util.isBlank(clonePValue)) {
        if (encoded) {
          clonePValue = client.decodeParaValue(clonePValue);
        }
        // render clonePValue into tags codes here.
        var multiValues = [];
        if (!ds.util.isBlank(clonePValue)) {
          clonePValue = clonePValue.replace(/\[/, "");
          clonePValue = clonePValue.replace(/\]/, "");
          if (clonePValue.indexOf(',') !== -1) {
            multiValues = clonePValue.split(",");
          } else {
            multiValues.push(clonePValue);
          }
        }

        if (encoded) {
          for (var mulindex = 0; mulindex < multiValues.length; mulindex++) {
            multiValues[mulindex] = decodeURIComponent(multiValues[mulindex]);
          }
        }

        $('#parameter_value' + i).textext()[0].tags().addTags(multiValues);

        renderable = true;
      }
    }

    // remove param in $(#api)/ in parsedClonedAPIArray
    if (renderFlag && renderable) {
      client.willRemoveParamsOfClonedAPI.push(param_name);
      client.appendUnRemovedParams();
      // set dfd resolve when done.
      dfd.resolve();
    } else {
      if (renderable) {
        dfd.reject({
          msg: MESSAGES.get('RENDER_INPUT_PARAM_ERROR')
        });
      } else {
        dfd.reject();
      }
    }

  } else {
    var description = para.description || "";

    value = '<input type="text" id="parameter_value' + i + '"' + ' name="parameter_value' + i
            + '" class="template-input parameters-input" placeholder="' + description + '" /> ';

    value = this.appendHelpLinkCheck(value, this.helpLinkURL, para);
    $('#value_' + i).html(value);

    if (this.helpLinkURLCheck(this.helpLinkURL, para)) {
      $('#value_' + i).find("input").addClass("add-on");
      $('#value_' + i).css("position", "relative");
    }

    var clonePValue = '';
    var renderable = false;
    if (renderFlag) {
      clonePValue = client.getClonedParamValueByName(param_name);
      if (!ds.util.isBlank(clonePValue)) {
        if (encoded) {
          clonePValue = client.decodeParaValue(clonePValue);
        }
        $('#parameter_value' + i).val(clonePValue);
        renderable = true;
      }
    }

    if (renderFlag && renderable) {
      client.willRemoveParamsOfClonedAPI.push(param_name);
      client.appendUnRemovedParams();
      dfd.resolve();
    } else {
      if (renderable) {
        dfd.reject({
          msg: MESSAGES.get('RENDER_INPUT_PARAM_ERROR')
        });
      } else {
        dfd.reject();
      }
    }
  }

  return dfd.promise();
};

DsClient.prototype.registerComponent = function(component) {
  this.components[component.name] = component;
};

/**
 * Get the related component by its component position index
 * 
 * @param index
 *          component position index
 * @returns component object
 */
DsClient.prototype.getComponetByIndex = function(index) {
  var components = this.components;
  if (!ds.util.isBlank(components)) {
    for ( var comName in components) {
      if (components.hasOwnProperty(comName)) {
        var component = components[comName];
        if (component.index === index) { return component; }
      }
    }
  }

  return void 0;
};

/**
 * thie method will append help link to parameter selector
 * 
 * @param source
 *          the parameter selector original html code
 * @param queryInfo
 *          the query info of help link
 * @returns the tartget parameter selector html code
 */
DsClient.prototype.appendHelpLinkCheck = function(source, helpLinkURL, para) {
  source = source + this.genHelpLink(helpLinkURL, para);
  return source;
};

/**
 * check the helpLinkURL whether empty
 * 
 * @param helpLinkURL
 * @param queryInfo
 * @returns {Boolean}
 */
DsClient.prototype.helpLinkURLCheck = function(helpLinkURL, para) {
  var queryInfo = para.helpLink;
  var helpContent = para.helpContent;
  var isHasLink = ((!ds.util.isBlank(queryInfo)) && (queryInfo !== "") && (!ds.util.isBlank(this.helpLinkURL)) && (this.helpLinkURL !== ""));
  var isHasHelpContent = (!ds.util.isBlank(helpContent)) && (helpContent !== "");

  return (isHasLink || isHasHelpContent);
};

/**
 * generate help link part html code
 * 
 * @param queryInfo
 *          the query info of help link
 * @returns the link <a> html code
 */
DsClient.prototype.genHelpLink = function(helpLinkURL, para) {
  var client = this;
  var link = "";
  if (this.helpLinkURLCheck(helpLinkURL, para)) {
    var id = "harvester-param-help-" + para.id;
    var containerId = "harvester-help-container-" + para.id;

    var helpLinkTemp = '<div class="help-container" id="' + containerId + '" ><a target="_blank" href="' + helpLinkURL
            + '?%queryInfo%">' + '<div class="flag-tips">' + '?' + '</div></a></div>';
    link = helpLinkTemp.replace("%queryInfo%", para.helpLink);

    var closeTimeout = function() {
    };

    $("body").undelegate("#" + containerId, "mouseover");
    $("body").delegate(
            "#" + containerId,
            "mouseover",
            function() {
              if ($("#" + id).length === 0) {
                var $tip = '<div id="' + id + '" class="message flag-tips-message" style="display: block;">';

                var helpLink = para.helpLink;

                if ((!ds.util.isBlank(helpLink)) && (helpLink !== "") && (!ds.util.isBlank(client.helpLinkURL))
                        && (client.helpLinkURL !== "")) {
                  $tip = $tip + '<div class="message-title">See More Information From <a target="_blank" href="' + helpLinkURL
                          + '?' + para.helpLink + '">Documention</a></div>';
                }

                $tip = $tip + '<div class="message-content">' + para.helpContent + '</div></div>';

                $("body").append($tip);

                var tipHeight = $("#" + id).height();
                var screenHeight = $(window).height();
                var scroolTop = $(window).scrollTop();
                var flagTop = $("#" + containerId).find(".flag-tips").offset().top;
                var flagLeft = $("#" + containerId).find(".flag-tips").offset().left;
                var bottomAvailHeight = screenHeight + scroolTop - flagTop;
                var topAvailHeight = flagTop - scroolTop;

                var tp = {
                  top: 0,
                  left: 18
                };

                if ((bottomAvailHeight < tipHeight) && (bottomAvailHeight < topAvailHeight)) {
                  tp.top = tipHeight * (-1) + 18;
                }

                $("#" + id).css("top", flagTop + tp.top);
                $("#" + id).css("left", flagLeft + tp.left);
                $("#" + containerId).find(".flag-tips").addClass("hover");
              } else {
                clearTimeout(closeTimeout);
              }
            });

    $("body").undelegate("#" + containerId, "mouseout");
    $("body").delegate("#" + containerId, "mouseout", function() {
      closeTimeout = setTimeout(function() {
        $("#" + containerId).find(".flag-tips").removeClass("hover");
        $("#" + id).remove();
      }, 500);
    });

    $("body").undelegate("#" + id, "mouseout");
    $("body").delegate("#" + id, "mouseout", function() {
      closeTimeout = setTimeout(function() {
        $("#" + containerId).find(".flag-tips").removeClass("hover");
        $("#" + id).remove();
      }, 500);
    });

    $("body").undelegate("#" + id, "mouseover");
    $("body").delegate("#" + id, "mouseover", function() {
      clearTimeout(closeTimeout);
    });
  }

  return link;
};

DsClient.prototype.checkParameter = function() {
  if (!this.clientool) { return true; }
  if (this.editableAPI) { return true; }

  var checkGroups = this.getCheckGroups();
  var isExistPass = true;
  var checkExist = {};
  var checkArray = [];
  var requiredGroup = "";
  var i = 0;
  var j = 0;
  var paraName = "";
  var field = "";

  // check required parameter whether exist
  for (field in checkGroups) {
    if (checkGroups.hasOwnProperty(field)) {
      checkArray = checkGroups[field];
      checkExist[field] = false;
      for (i = 0; i < checkArray.length; i++) {
        paraName = checkArray[i].name;
        for (j = 0; j < this.paramertChecKList.length; j++) {
          if (paraName === this.paramertChecKList[j].name) {
            checkExist[field] = true;
          }
        }
      }
    }
  }

  for (requiredGroup in checkExist) {
    if (checkExist.hasOwnProperty(requiredGroup) && checkExist[requiredGroup] === false) {
      checkArray = checkGroups[requiredGroup];
      isExistPass = false;
      if (checkArray.length === 1) {
        alert(MESSAGES.get('REQUIRED_PARAMETER_ERROR_PREFIX') + checkArray[0].name
                + MESSAGES.get('REQUIRED_PARAMETER_ERROR_SUFFIX'));
      } else if (checkArray.length > 1) {
        alert(MESSAGES.get('EITHER_PARAMETER_ERROR_PREFIX') + this.getParaName(checkArray).toString()
                + MESSAGES.get('EITHER_PARAMETER_ERROR_SUFFIX'));
      }
    }
  }

  if (isExistPass) {
    for (requiredGroup in checkExist) {
      if (checkExist.hasOwnProperty(requiredGroup)) {
        // check value whether empty
        checkArray = checkGroups[requiredGroup];
        var isValuePass = false;
        for (i = 0; i < checkArray.length; i++) {
          paraName = checkArray[i].name;
          for (j = 0; j < this.paramertChecKList.length; j++) {
            if ((paraName === this.paramertChecKList[j].name) && ($.trim(this.paramertChecKList[j].value).length > 0)) {
              isValuePass = true;
            }
          }
        }

        if (!isValuePass) {
          if (checkArray.length === 1) {
            alert(MESSAGES.get('EMPTY_PARAMETER_ERROR_PREFIX') + checkArray[0].name
                    + MESSAGES.get('EMPTY_PARAMETER_ERROR_SUFFIX'));
          } else if (checkArray.length > 1) {
            alert(MESSAGES.get('EITHER_EMPTY_ERROR_PREFIX') + this.getParaName(checkArray).toString()
                    + MESSAGES.get('EITHER_EMPTY_ERROR_SUFFIX'));
          }

          return false;
        }
      }
    }
  } else {
    return false;
  }

  // check date
  return this.componentCheck();
};

/**
 * will invoke each components' check method
 * 
 * @returns {Boolean}
 */
DsClient.prototype.componentCheck = function() {
  if (!ds.util.isBlank(this.components)) {
    var components = this.components;
    for ( var componentName in components) {
      if (components.hasOwnProperty(componentName) && (!components[componentName].check())) { return false; }
    }
  }

  return true;
};

DsClient.prototype.setCurrentApi = function(api) {
  var k = 0;

  if (api.indexOf('?') !== -1) {
    if ($.trim(api.substring(api.indexOf('?') + 1)).length > 0) {
      this.editableAPI = true;
    } else {
      this.editableAPI = false;
    }
    api = api.substring(0, api.indexOf('?'));
  } else {
    this.editableAPI = false;
  }

  if (this.cloneMode) {
    this.editableAPI = false;
  }

  if (ds.util.isBlank(this.currentApi)) {
    for (k = 0; k < this.apis.length; k++) {
      if (this.apis[k].name === api) {
        this.currentApi = this.apis[k];
        break;
      } else {
        this.currentApi = null;
      }
    }
  } else {
    if (this.currentApi.name !== api) {
      for (k = 0; k < this.apis.length; k++) {
        if (this.apis[k].name === api) {
          this.currentApi = this.apis[k];
          break;
        } else {
          this.currentApi = null;
        }
      }
    }
  }

};

/**
 * leave out the content after '?'(including '?') in a request url and trim the
 * url
 * 
 * @param api
 *          callAPI url
 * @returns result api
 */
DsClient.prototype.shortenURL = function(api) {
  if (api.indexOf('?') !== -1) {
    api = api.substring(0, api.indexOf('?'));
  }

  api = $.trim(api);
  return api;
};

DsClient.prototype.checkRelyOn = function(parentId) {
  client = this;
  // update
  if (parseInt(parentId) !== 0) {
    $('[parentId=' + parentId + ']').each(function() {
      var paraId = $(this).attr("paraId");
      var i = $(this).attr("index");
      client.getParameterValue(paraId, i);
    });
  }

  for (var i = 0; i < this.index; i++) {
    if ($('#parameter_name' + i).length > 0) {
      var relyOnId = $('#parameter_name' + i).attr("parentId");
      // the parameter is missing
      if (!ds.util.isBlank(relyOnId) && !ds.util.isBlank(this.getParaValue(relyOnId))) {
        alert(MESSAGES.get('RELYON_PARAMETER_MISSING_ERROR_PREFIX') + this.getParaName4Id(relyOnId)
                + MESSAGES.get('RELYON_PARAMETER_MISSING_ERROR_SUFFIX'));
        $('[parentId=' + relyOnId + ']').closest(".addbox").remove();
      }
      ;
    }
    ;
  }
  ;

};

DsClient.prototype.isParent = function(paraId) {
  var isParent = false;
  for (var i = 0; i < this.index; i++) {
    if ($('#parameter_name' + i).length > 0) {
      var parentId = $('#parameter_name' + i).attr("parentId");
      if (parseInt(parentId) === parseInt(paraId)) {
        isParent = true;
        break;
      }
    }
  }

  return isParent;
};

DsClient.prototype.getSelectdata = function(para) {
  var dfd = $.Deferred();
  var result = {};

  if ((para.type === 'period') || (para.type === 'period:date')) {
    result.data = {};
    dfd.resolve(result);
    return dfd.promise();
  }

  var parentId = para.parentId;
  var paraId = para.id;

  result.parentName = this.getParaName4Id(parentId);
  var parentValue = this.getParaValue(parentId);

  if (parentId === 0 || para.type === 'multiple:N' || !(ds.util.isBlank(parentValue) || parentValue === '')) {
    this.getParameterValueArray(paraId, parentValue).done(function(data) {
      result.data = data;
      dfd.resolve(result);
    }).progress(function(data) {
      dfd.notify();
    }).fail(function() {
      dfd.reject();
    });
  } else {
    dfd.reject(result);
  }

  return dfd.promise();

};

DsClient.prototype.initChartDefaultSetting = function(options) {
  this.defaultSettings = {};
  this.defaultSettings.title = options.title.text;
  this.defaultSettings.subtitle = options.subtitle.text;
  this.defaultSettings.categories = options.xAxis.categories;
  this.defaultSettings.yAxis = [{
    "enabled": "true",
    "title": "",
    "unit": ""
  }, {
    "enabled": "false",
    "title": "",
    "unit": ""
  }];
  this.defaultSettings.series = [];

  var colorSize = this.options.colors.length;
  var statusColorCache = {};

  for (var i = 0; i < options.series.length; i++) {
    var serie = {};
    serie.belongsto = "0";
    serie.lineStyle = "Solid";
    this.options.series[i].name = this.options.series[i].name || ("Series " + (i + 1));
    serie.name = this.options.series[i].name;
    serie.oldname = i;
    serie.type = this.options.chart.type;

    var serieKey = serie.name;
    // check if series' name were influenced by scope parameter.
    if (!ds.util.isBlank(options.series[i].stack)) {
      serieKey = options.series[i].stack;
    }

    // add the default color/borderColor to the higchart serie by hand
    if (ds.util.getBugzillaSerieColor(serieKey) == null) {
      serie.borderColor = this.options.borderColors[i % colorSize];
      this.options.series[i].borderColor = serie.borderColor;
      serie.color = this.options.colors[i % colorSize];
      this.options.series[i].color = serie.color;
    } else {
      var colorObj = ds.util.getBugzillaSerieColor(serieKey, statusColorCache);
      serie.borderColor = colorObj.borderColor;
      this.options.series[i].borderColor = colorObj.borderColor;
      serie.color = colorObj.color;
      this.options.series[i].color = colorObj.color;
    }

    this.defaultSettings.series.push(serie);
  }

  if (this.isPieDataStructure()) {
    var peiData = this.options.series[0].data;
    this.initDefaultPieData(peiData);
  }
  ;
};

/**
 * this method can be used after currentApi is inited
 */
DsClient.prototype.isPieDataStructure = function() {
  var data = this.options.series[0].data;
  return $.isArray(data) && (data.length > 0)
          && ((!ds.util.isBlank(data[0].name)) || $.isArray(data[0]));
};

/**
 * Add default color to pie data
 * 
 * @param pieData
 */
DsClient.prototype.initDefaultPieData = function(pieData) {
  if ($.isArray(pieData) && $.isArray(pieData[0])) {
    this.defaultSettings.series[0].data = [];
    this.options.series[0].data = [];

    var colorSize = this.options.colors.length;

    for (var i = 0; i < pieData.length; i++) {
      var singPieData = pieData[i];
      var name = singPieData[0];
      var y = singPieData[1];
      var color = this.options.colors[i % colorSize];
      var newPieData = new PieData(name, y, color);
      var defaultPieData = new PieData(name, y, color);
      this.defaultSettings.series[0].data.push(defaultPieData);
      this.options.series[0].data.push(newPieData);
    }

    if (this.format === "pie") {
      this.options.series[0].color = void 0;
      this.options.series[0].borderColor = void 0;
    }
  }
};

/**
 * add the customize setting into chart options
 * 
 * @param options
 *          the default chart options
 * @param customize_settings
 *          the customize settings
 */
DsClient.prototype.customizeSetting = function(options, customize_settings) {
  // protect the client reference
  var client = this;
  var title = customize_settings.title;
  var subtitle = customize_settings.subtitle;
  var exporting = customize_settings.exporting;
  var categories = options.xAxis.categories;

  var yaxisArr = this.customizeyAxis(customize_settings.yaxis);
  var series = this.customizeSeries(options.series, customize_settings.series);

  options.title.text = title || "";
  options.subtitle.text = subtitle || "";

  if (!ds.util.isBlank(categories) && categories.length !== 0) {
    options.xAxis.categories = this.customizeCategories(categories, customize_settings.categories);
  }

  if (!ds.util.isBlank(yaxisArr) && yaxisArr.length !== 0) {
    this.options.yAxis = yaxisArr;
  }

  // add the customize exporting setting into options
  if (!ds.util.isBlank(exporting) && client.checkUrl(exporting.url)) {
    options.exporting.url = exporting.url;
    options.exporting.enabled = exporting.enabled || false;
  } else {
    options.exporting.enabled = false;
  }

  options.series = series;

  this.options = options;
};

/**
 * check the url www.test.com & http://www.test.com
 * 
 * @param url
 * @returns {Boolean}
 */
DsClient.prototype.checkUrl = function(url) {
  var regEx = /^(https?:\/\/)?[\da-z-]+(\.[\da-z-]+)*(\:\d+)?(\/[\da-z-]*)*(\/?|([\da-z-]+\?[\da-z-]+=[\da-z-]+(&[\da-z-]+=[\da-z-]+)*))$/;
  return !ds.util.isBlank(url) && regEx.test(url);
};

/**
 * check if the url is a internal API url
 * 
 * @param url
 * @returns {Boolean}
 */
DsClient.prototype.checkInternalApiUrl = function(url) {
  return url.startsWith(this.API_HOST + "/dataservice/api");
};

DsClient.prototype.customizeCategories = function(categories, customize_categories) {
  for ( var field in customize_categories) {
    if (customize_categories.hasOwnProperty(field)) {
      categories[parseInt(field)] = customize_categories[field];
    }
  }

  return categories;
};

DsClient.prototype.customizeSeries = function(series, customize_series) {
  if (!ds.util.isBlank(series) && !ds.util.isBlank(customize_series)) {
    for (var i = 0; i < series.length; i++) {
      series[i].oldname = i;
      for (var j = 0; j < customize_series.length; j++) {
        var cusSerie = customize_series[j];
        // the oldname is the order index of the serie in json result
        if (parseInt(series[i].oldname) === parseInt(customize_series[j].oldname)) {
          // the customize serie may not have all the fields in Serie
          // definded in ds-client.js
          for ( var customizeField in cusSerie) {
            if (cusSerie.hasOwnProperty(customizeField)) {
              if (customizeField === 'belongsto') {
                series[i].yAxis = parseInt(cusSerie.belongsto);
              } else if (customizeField === 'lineStyle') {
                series[i].dashStyle = cusSerie.lineStyle;
              }

              if (customizeField !== "data") {
                series[i][customizeField] = cusSerie[customizeField];
              }
            }
          }
        }

        // customize pei data setting
        if ((i === 0) && $.isArray(customize_series[j].data)) {
          var cusSerieData = customize_series[j].data;
          for (var k = 0; k < cusSerieData.length; k++) {
            var singlePieData = cusSerieData[k];
            if (!ds.util.isBlank(singlePieData.index)) {
              var index = parseInt(singlePieData.index);
              if (!ds.util.isBlank(series[i].data[index]) && !ds.util.isBlank(series[i].data[index].name)) {
                series[i].data[index].name = singlePieData.name || series[i].data[index].name;
                series[i].data[index].color = singlePieData.color || series[i].data[index].color;
              }
            }
          }
        }
      }
    }
  }

  return series;
};

DsClient.prototype.customizeyAxis = function(customize_yaxis) {
  var yaxisArray = customize_yaxis;
  var resultYaxisArr = [];
  if (!ds.util.isBlank(yaxisArray)) {
    for (var i = 0; i < yaxisArray.length; i++) {
      var yaxis = yaxisArray[i];
      if (yaxis.enabled === 'true') {
        var y = {
          labels: {
            format: '{value}' + (yaxis.unit || "")
          },
          title: {
            text: (yaxis.title || "")
          }
        };
        if (i === yaxisArray.length - 1) {
          y.opposite = true;
        }

        y.enabled = yaxis.enabled;
        y.unit = yaxis.unit;
        resultYaxisArr.push(y);
      }
    }
  }

  return resultYaxisArr;
};

/**
 * get value from parameter's id, will do escape and encode jobs
 * 
 * @param paraId
 * @returns {String}
 */
DsClient.prototype.getParaValue = function(paraId) {
  var client = this;

  if (!ds.util.isBlank(paraId) && (paraId !== "") && (paraId !== 0)) {
    var i = parseInt($("[paraId=" + paraId + "]").attr("index"));
    var component = this.getComponetByIndex(i);
    var type = $('#parameter_value' + i).attr("paratype");
    var encoded = this.getPara4Id(paraId).encoded;
    var value = "";

    if (ds.util.isBlank(component)) {
      value = $('#parameter_value' + i).val();
      if (type === 'people') {
        value = $('#parameter_value' + i).siblings('input').val();
        value = value.replace(/\"/g, '');
        value = value == '[]' ? '' : value;
      }

      if (!ds.util.isBlank(value) && encoded) {
        value = client.encodeParaValue(value);
      }
    } else {
      value = component.getValue();
    }

    return value;
  } else {
    return void 0;
  }
};

DsClient.prototype.getParaName4Id = function(paraId) {
  var api = $.trim($('#api').val());
  this.setCurrentApi(api);

  if (this.editableAPI) { return ""; }

  if (!ds.util.isBlank(this.currentApi) && !ds.util.isBlank(this.currentApi.parameters)) {
    for (var i = 0; i < this.currentApi.parameters.length; i++) {
      var p = this.currentApi.parameters[i];
      if (parseInt(p.id) === parseInt(paraId)) { return p.name; }
    }
  }
};

DsClient.prototype.getPara4Id = function(paraId) {
  var api = $.trim($('#api').val());
  this.setCurrentApi(api);

  if (this.editableAPI) { return ""; }

  if (!ds.util.isBlank(this.currentApi) && !ds.util.isBlank(this.currentApi.parameters)) {
    for (var i = 0; i < this.currentApi.parameters.length; i++) {
      var p = this.currentApi.parameters[i];
      if (parseInt(p.id) === parseInt(paraId)) { return p; }
    }
  }
};

DsClient.prototype.getParaByName = function(parameters, name) {
  var p = {};
  if (!ds.util.isBlank(parameters)) {
    for (var i = 0; i < parameters.length; i++) {
      p = parameters[i];
      if (p.name === name) { return p; }
    }
  }

  return p;
};

/**
 * Get the value /list/{parentname:.*}/{type:.*}
 * 
 * @param paraId
 * @param parentValue
 * @returns
 */
DsClient.prototype.getParameterValueArray = function(paraId, parentValue) {
  var dfd = $.Deferred();
  dfd.notify();
  var api = this.API_HOST + "/dataservice/api/sys/param/list/" + paraId;
  var data = {};

  if (!ds.util.isBlank(parentValue)) {
    data.parentValue = parentValue;
  }

  $.ajax({
    url: api,
    type: 'GET',
    data: data,
    cache: false,
    dataType: "jsonp",
    success: function(result) {
      if (!ds.util.isBlank(result.error)) {
        ds.util.errorHandler(result.error);
        dfd.reject(result);
      } else {
        dfd.resolve(result);
      }
    },
    error: function() {
      dfd.reject();
    }
  });

  return dfd.promise();
};

DsClient.prototype.initChartTemplate = function() {
  var client = this;
  var classes = [];
  var i = 0;

  for (i = 0; i < client.apis.length; i++) {
    var cla = client.apis[i].classification;
    if (!ds.util.isBlank(cla) && !this.contains(classes, cla)) {
      classes.push(cla);
    }
  }

  for (i = 0; i < classes.length; i++) {
    var html = '<button class="btn runbutton template-btn" classification="' + classes[i] + '" >' + classes[i] + '</a>';
    $(".chart-select").append(html);
  }

  var classification = $(".chart-select").find("button").first().text();
  var template = client.getTemplateContent(client.getSubApis(classification));
  $(".chart-template-content").html(template);

  $(document).click(function(e) {
    var container = $(".dorpdown-menu1");
    // if the target of the click isn't the container...
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      container.hide();
    }
  });

  $(".chart-select").find("button").click(function(e) {
    e.stopPropagation();
    classification = $(this).text();
    template = client.getTemplateContent(client.getSubApis(classification));
    $(".chart-template-content").html(template);
    var apiName = (client && client.currentApi && client.currentApi.name) || "";
    $(".chart-control.chart-control-choose").removeClass("chart-control-choose");
    $(".chart-control[api='" + apiName + "']").addClass("chart-control-choose");
    $('.dorpdown-menu1').show();
    $('#UsedApisContainer').hide();
  });

  $("body").delegate(".chart-control", "click", function() {
    var api = $(this).attr("api");
    $("#api").val(api);
    $("#api").trigger("input");
    $('.dorpdown-menu1').hide();
    $("#Advance_Setting").hide();
    $('#adv-button-direction').remove();
    $('#adv-button-arrow').remove();
    $("#Settings").css({
      'z-index': "auto",
      'position': "static"
    });
  });

  $("body").delegate(".findmore", "click", function() {
    $('.dorpdown-menu1').hide();
  });

};

DsClient.prototype.getTemplateContent = function(subApis) {
  subApis = subApis || [];
  var template = '';
  for (var i = 0; i < subApis.length; i++) {
    var api = subApis[i].name;
    var classification = subApis[i].classification.toLowerCase();
    var displayName = api.substring(api.lastIndexOf(classification) + classification.length + 1);
    var description = subApis[i].description || "No description";
    template += '<div class="chart-control" api=' + api + '>' + '<a href="#" >' + '<div class="template-title">'
            + '<div class="template-img">' + '<img src="resources/images/' + subApis[i].img + '.svg" />' + '</div>'
            + '<div class="template-display-name">' + displayName + '</div>' + '</div>'
            + '<div class="template-description-container" >' + description + '</div>' + '</a>'
            + '<a target="_blank" href="https://docs.engineering.redhat.com/pages/viewpage.action?pageId=' + subApis[i].pageid
            + '" class="findmore">Find more in API doc</a>' + '</div>';
  }
  return template;
};

DsClient.prototype.getSubApis = function(classification) {
  var subApis = [];
  for (var i = 0; i < this.apis.length; i++) {
    if (this.apis[i].classification === classification) {
      subApis.push(this.apis[i]);
    }
  }

  return subApis;
};

DsClient.prototype.contains = function(array, value) {
  for (var i = 0; i < array.length; i++) {
    if (array[i] === value) { return true; }
  }
  return false;
};

DsClient.prototype.getCheckGroups = function() {
  var groups = {};
  var paras = this.getRequiredPara();
  for (var i = 0; i < paras.length; i++) {
    var requiredGroup = paras[i].requiredGroup.toString();
    groups[requiredGroup] = groups[requiredGroup] || [];
    groups[requiredGroup].push(paras[i]);
  }
  return groups;
};

DsClient.prototype.parseClonedAPIParams = function() {
  var apiUrl = $("#api").val();

  // seperate apiUrl to [api , param] two parts.
  var paramsPart = $.trim(apiUrl.substring(apiUrl.indexOf('?') + 1));
  var apiPart = $.trim(apiUrl.substring(0, apiUrl.indexOf('?')));

  // leave only apiPart in input text
  $("#api").val(apiPart);

  // parse parameters
  var paramArray = paramsPart.split('&');
  this.clonedAPIParamsMap = [];
  this.willRemoveParamsOfClonedAPI = [];
  $.extend(this.clonedAPIParamsMap, paramArray);
};

DsClient.prototype.renderParamsFromClonedAPI = function() {
  var apiUrl = $("#api").val();
  var paramsPart = $.trim(apiUrl.substring(apiUrl.indexOf('?') + 1));
  var paramArray = paramsPart.split('&');

  var client = this;
  var dateRegEx = /(^date$)|(^date\|)/;

  try {

    for (var i = 0; i < this.index; i++) {
      var name = ds.util.lowerFirstChar($('#parameter_name' + i).text());
      if (!client.getParamKeyValuePair(paramArray, name)) {
        continue;
      }
      var type = $('#parameter_value' + i).attr("paratype");
      // var paraId = $('#parameter_name' + i).attr("paraId");
      var kvValue = client.getParamKeyValuePair(paramArray, name);
      var parentId = $("#parameter_name" + i).attr("parentId");

      var successFlag = false;

      if (dateRegEx.test(name) || $('#parameter_from_value_' + i).length > 0) {
        // date type

      } else if (type === 'select') {
        // judge parentFirst;
        if (parentId != null) {
          var parentName = this.getParaName4Id(parentId);
          if (!client.getParamKeyValuePair(paramArray, parentName)) { throw 'Do not find parent error!'; }
        }

        $('#parameter_value' + i + ' option').each(function() {
          if (successFlag) { return; }

          if ($(this).val() == kvValue) {
            $(this).attr('selected', 'selected');
            successFlag = true;
          }
        });

        if (!successFlag) { throw 'Do not find mapping value,error!'; }

      } else if (type === 'multiple' || type === 'multiple:N') {
        // judge parentFirst;
        if (parentId != null) {
          var parentName = this.getParaName4Id(parentId);
          if (!client.getParamKeyValuePair(paramArray, parentName)) { throw 'Do not find parent error!'; }
        }

        $('#parameter_value' + i + ' option').each(function() {
          if ($(this).val() == kvValue) {
            $(this).attr('selected', 'selected');
            successFlag = true;
          }
        });

        if (!successFlag) { throw 'Do not find mapping value,error!'; }

      } else {
        // judge parentFirst;
        if (parentId != null) {
          var parentName = this.getParaName4Id(parentId);
          if (!client.getParamKeyValuePair(paramArray, parentName)) { throw 'Do not find parent error!'; }
        }

        if ($('#parameter_value' + i).val(kvValue)) {
          successFlag = true;
        }

        if (!successFlag) { throw 'Do not find mapping value,error!'; }
      }

    }
  } catch (e) {
    $('#' + this.reportdiv).html("<div style='margin:10px auto;'>" + e + "</div>");
    $('#' + this.reportdiv).addClass('alert alert-error');
  }

  // after renders ,close clone mode.
  client.closeCloneMode();
};

DsClient.prototype.getClonedParamValueByName = function(pName) {
  for ( var i in this.clonedAPIParamsMap) {
    var kvEntry = this.clonedAPIParamsMap[i];
    var kvName = kvEntry.split('=')[0];
    var kvValue = kvEntry.split('=')[1];

    if (pName == kvName) { return kvValue; }
  }

  return null;
};

DsClient.prototype.appendUnRemovedParams = function() {
  var clonedAPIParamsMap = [];
  var willRemoveParamsOfClonedAPI = [];
  $.extend(clonedAPIParamsMap, this.clonedAPIParamsMap);
  $.extend(willRemoveParamsOfClonedAPI, this.willRemoveParamsOfClonedAPI);

  // remove cloned params
  var remainedParams = $.grep(clonedAPIParamsMap, function(item) {
    var kvName = item.split('=')[0];
    return ($.inArray(kvName, willRemoveParamsOfClonedAPI) === -1);
  });

  var apiUrl = $("#api").val();
  if (apiUrl.indexOf('?') > -1) {
    apiUrl = apiUrl.substring(0, apiUrl.indexOf('?'));
  }

  var paramPart = '';

  if (remainedParams.length > 0) {
    apiUrl += '?';
    // apend remained params to text input
    for ( var k in remainedParams) {
      var kvEntry = remainedParams[k];
      var kvName = kvEntry.split('=')[0];
      var kvValue = kvEntry.split('=')[1];

      // check the value real value
      if ($.trim(kvName).length > 0 && $.trim(kvValue).length > 0) {
        paramPart = paramPart + '&' + kvName + '=' + kvValue;
      }
    }

    if ($.trim(paramPart).length > 0) {
      paramPart = paramPart.substring(1, paramPart.length);
    }
  }

  $("#api").val(apiUrl + paramPart); // render new api
};

DsClient.prototype.initOrUpdateUsedAPIsTemplate = function() {
  var client = this;

  if ($("#UsedButton").length === 0) {
    $(".chart-select").after(
            '<div id="UsedButton" ><img class="used-api-bookmark" src="resources/images/bookmark.png" /></div>');
  }

  $("#UsedButton").hover(function() {
    ds.util.showTip($("#UsedButton"), "Entries from used APIs", "used_api_tip", false);
  }, function() {
    $("#used_api_tip").remove();
  });

  $(document).click(function(e) {
    var container = $('#UsedApisContainer');
    // if the target of the click isn't the
    // container...
    if (!container.is(e.target) && container.has(e.target).length === 0) {
      container.hide();
    }
  });

  $('#UsedButton').unbind('click');
  $('#UsedButton').bind('click', function(e) {
    e.stopPropagation();

    $('#UsedApisContainer').find("table").find("tbody").html("<td>Loading...</td>");
    $('#UsedApisContainer').show();
    $('.dorpdown-menu1').hide();

    client.getUsedAPIsList().done(function(tableHTML) {
      // clear and prepare first.
      client.clearUsedApi();
      $('#UsedApisContainer').find("table").find("tbody").append(tableHTML);

      $('#UsedApisContainer').find("table tbody tr").unbind("click");
      $('#UsedApisContainer').find("table tbody tr").bind("click", function() {
        var trAPI = $(this).find("td:eq(0)").attr("title");
        $('#UsedApisContainer').hide();
        client.cloneAPI(trAPI);
      });
    }).fail(function(result) {
      // alert handle
      var description = MESSAGES.get("COMMON_ERROR_MSG");
      if (!ds.util.isBlank(result.error) && !ds.util.isBlank(result.error.description)) {
        description = result.error.description;
      }

      $(".drill-container .loader").html("<font style='color:red'>" + description + "</font>");
    });
  });
};

DsClient.prototype.getUsedAPIsList = function() {
  var dfd = $.Deferred();
  $.ajax({
    async: false,
    url: this.API_HOST + '/dataservice/usedApi',
    dataType: 'text',
    success: function(result) {
      if (!ds.util.isBlank(result.error)) {
        dfd.reject(result);
      } else {
        dfd.resolve(result);
      }
    },
    error: function(result) {
      dfd.reject(result);
    }
  });

  return dfd.promise();
};

DsClient.prototype.clearUsedApi = function() {
  $('#UsedApisContainer').find("table").find("tbody").empty();
};

DsClient.prototype.delDuplicateParamInAPIInput = function(serialParamNV) {
  this.serialParaWithRep = true;

  var apiUrl = $("#api").val();

  if (apiUrl.indexOf('?') < 0) { return; }
  // seperate apiUrl to [api , param] two parts.
  var paramsPart = $.trim(apiUrl.substring(apiUrl.indexOf('?') + 1));
  var apiPart = $.trim(apiUrl.substring(0, apiUrl.indexOf('?')));

  var paramArray = paramsPart.split('&');
  for ( var inputNVindex in paramArray) {
    var inputNV = paramArray[inputNVindex];
    if (inputNV.split("=")[0] == serialParamNV.name && $.trim(serialParamNV.value).length > 0) {
      paramArray.splice(inputNVindex, 1);
      break;
    }
  }

  paramsPart = '';
  for ( var inputNVindex in paramArray) {
    paramsPart += '&' + paramArray[inputNVindex];
  }

  if (paramsPart != '') {
    apiPart += '?';
    apiPart = apiPart + paramsPart.substring(1, paramsPart.length);
  }

  $("#api").val(apiPart);
};
