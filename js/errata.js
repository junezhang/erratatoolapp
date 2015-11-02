var Errata = function(){
	this.HOST = "http://10.66.141.235:8080/dataservice/api/sys/mobile/errata/advisory/";
	this.userName = "";
	
	this.init();
};

Errata.prototype.Errata = Errata;

Errata.prototype.init = function(type){
	$.support.cors = true;
	this.summary();
	this.list();
};



Errata.prototype.list = function(status,page){
	var data = {status : status , page : page,userName : this.userName};
	var errata = this;
	$.ajax({
		url : this.HOST+"list",
		dataType : "jsonp",
		data : data,
		type : "POST",
		success : function(data){
			var list = data.list;
			for(var i = 0 ; i < list.length ; i++){
				var advisory = list[i];
				var adv = new AdvListItem(advisory.id,advisory.fulladvisory,advisory.synopsis,advisory.status);
			    $('#adv_list').append(adv);
				$('#adv_'+advisory.id).bind("click",function(){
					errata.detail($(this).attr("id"));					
				});
			}
			
		},
		error : function(xhr,status,err){
			alert(status);
		}
	});
};

Errata.prototype.total = function(type){
	
};

Errata.prototype.summary = function(){
	
	$.ajax({
		url : this.HOST+"summary",
		dataType : "jsonp",
		success : function(data){
			$('#NEW_FILES').text(data.NEW_FILES);
			$('#QE').text(data.QE);
			$('#REL_PREP').text(data.REL_PREP);
			$('#PUSH_READY').text(data.PUSH_READY);
		},
		error : function(xhr,status,err){
			alert(status);
		}
	});
};

Errata.prototype.search = function(searchStr){
	
};

Errata.prototype.my = function(type){
	
};

Errata.prototype.detail = function(id){
	alert(id);
};

Errata.prototype.changeQA = function(name){
	
};

Errata.prototype.pushNotification = function(){
	
};

Errata.prototype.comment = function(id,content){
	
};

function AdvListItem(id,fulladvisory,synopsis,status){
	this.adv = $("<tr><td><a href='#' class='advlistitem' id='adv_"+id+"'>"+fulladvisory+"<br><span>"+synopsis+"</span></a></td>"
   +"<td>RHEL</td>"+"<td>RHEL-x.y.z</td>"
    +"<td><span>"+status+"</span></td>"
    +"</tr>");
	return this.adv;
}