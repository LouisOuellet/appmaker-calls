API.Plugins.calls = {
	element:{
		table:{
			index:{},
		},
	},
	init:function(){
		API.GUI.Sidebar.Nav.add('Calls', 'development');
		var checkCalls = setInterval(function() {
			if(API.initiated){
				clearInterval(checkCalls);
				API.request('calls','getActive',{report:true,toast:false},function(result){
					var dataset = JSON.parse(result);
					if(dataset.success != undefined){
						for(var [key, call] of Object.entries(dataset.output.calls.raw)){
							API.Plugins.calls.Widgets.toast({dom:dataset.output.calls.dom[call.id],raw:call},{dom:dataset.output.organizations.dom[call.organization],raw:dataset.output.organizations.raw[call.organization]},dataset.output.issues);
						}
					}
				});
			}
		}, 100);
	},
	load:{
		index:function(){
			API.Builder.card($('#pagecontent'),{ title: 'Calls', icon: 'calls'}, function(card){
				API.request('calls','read',{
					data:{
						options:{
							link_to:'CallsIndex',
							plugin:'calls',
							view:'index',
						},
					},
				},function(result) {
					var dataset = JSON.parse(result);
					if(dataset.success != undefined){
						for(const [key, value] of Object.entries(dataset.output.results)){ API.Helper.set(API.Contents,['data','dom','calls',value.id],value); }
						for(const [key, value] of Object.entries(dataset.output.raw)){ API.Helper.set(API.Contents,['data','raw','calls',value.id],value); }
						API.Builder.table(card.children('.card-body'), dataset.output.results, {
							headers:dataset.output.headers,
							id:'CallsIndex',
							modal:true,
							key:'phone',
							clickable:{ enable:true, view:'details'},
							breadcrumb:{ title:'phone' },
							controls:{ toolbar:true },
							import:{ key:'id' },
						},function(response){
							API.Plugins.calls.element.table.index = response.table;
						});
					}
				});
			});
		},
		details:function(){
			var container = $('div[data-plugin="calls"][data-id]').last();
			var url = new URL(window.location.href);
			var id = url.searchParams.get("id"), values = '', main = container.find('#calls_main_card'), timeline = container.find('#calls_timeline'),details = container.find('#calls_details').find('table');
			if(container.parent('.modal-body').length > 0){
				var thisModal = container.parent('.modal-body').parent().parent().parent();
				thisModal.find('.modal-header').find('.btn-group').find('[data-control="update"]').remove();
			}
			API.request(url.searchParams.get("p"),'get',{data:{id:id}},function(result){
				var dataset = JSON.parse(result);
				if(dataset.success != undefined){
					container.attr('data-id',dataset.output.this.raw.id);
					var tr = $('tr[data-id="'+dataset.output.this.raw.id+'"][data-type="calls"]');
					var organizationCTN = tr.parents().eq(9);
					API.GUI.insert(dataset.output.this.dom);
					// Create Call Widget
					if(typeof thisModal !== 'undefined'){
						thisModal.on('hide.bs.modal',function(){
							// API.Plugins.calls.Widgets.toast(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues);
						});
					}
					// Subscribe
					if(API.Helper.isSet(dataset.output.details,['users','raw',API.Contents.Auth.User.id])){
						main.find('.card-header').find('button[data-action="unsubscribe"]').show();
					} else { main.find('.card-header').find('button[data-action="subscribe"]').show(); }
					main.find('.card-header').find('button[data-action="unsubscribe"]').click(function(){
						API.request(url.searchParams.get("p"),'unsubscribe',{data:{id:dataset.output.this.raw.id}},function(answer){
							var subscription = JSON.parse(answer);
							if(subscription.success != undefined){
								main.find('.card-header').find('button[data-action="unsubscribe"]').hide();
								main.find('.card-header').find('button[data-action="subscribe"]').show();
								container.find('#calls_timeline').find('[data-type=user][data-id="'+API.Contents.Auth.User.id+'"]').remove();
							}
						});
					});
					main.find('.card-header').find('button[data-action="subscribe"]').click(function(){
						API.request(url.searchParams.get("p"),'subscribe',{data:{id:dataset.output.this.raw.id}},function(answer){
							var subscription = JSON.parse(answer);
							if(subscription.success != undefined){
								main.find('.card-header').find('button[data-action="subscribe"]').hide();
								main.find('.card-header').find('button[data-action="unsubscribe"]').show();
								var sub = {
									id:API.Contents.Auth.User.id,
									created:subscription.output.relationship.created,
									email:API.Contents.Auth.User.email,
								};
								API.Builder.Timeline.add.subscription(container.find('#calls_timeline'),sub,'user','lightblue');
							}
						});
					});
					// Name
					if((dataset.output.this.raw.contact != null)&&(dataset.output.this.raw.contact != '')&&(API.Helper.isSet(dataset.output.details,['users','dom',dataset.output.this.raw.contact]))){
						var contact = dataset.output.details.users.dom[dataset.output.this.raw.contact];
							contact.name = '';
							if(contact.first_name != ''){ contact.name += contact.first_name}
							if(contact.middle_name != ''){ if(contact.name != ''){contact.name += ' ';} contact.name += contact.middle_name}
							if(contact.last_name != ''){ if(contact.name != ''){contact.name += ' ';} contact.name += contact.last_name}
							if(contact.job_title != ''){ if(contact.name != ''){contact.name += ' - ';} contact.name += contact.job_title}
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="name"]').html(contact.name);
					} else {
						if(API.Helper.isSet(dataset.output.details,['organizations'])){
							container.find('#calls_details').find('td[data-plugin="calls"][data-key="name"]').html(dataset.output.details.organizations.dom[Object.keys(dataset.output.details.organizations.dom)[0]].name);
						}
					}
					// Status
					if(API.Auth.validate('custom', 'calls_status', 1)){
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').parent().show();
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+API.Contents.Statuses.calls[dataset.output.this.dom.status].color+'"><i class="'+API.Contents.Statuses.calls[dataset.output.this.dom.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[dataset.output.this.dom.status].name]+'</span>');
						container.find('#calls_notes select[name="status"]').show();
						for(var [statusOrder, statusInfo] of Object.entries(API.Contents.Statuses.calls)){
							container.find('#calls_notes select[name="status"]').append(new Option(API.Contents.Language[statusInfo.name], statusOrder));
						}
						container.find('#calls_notes select[name="status"]').val(dataset.output.this.dom.status);
					} else {
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').parent().remove();
						container.find('#calls_notes select[name="status"]').remove();
					}
					// Schedule
					if(API.Auth.validate('custom', 'calls_schedule', 1)){
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="schedule"]').parent().show();
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="schedule"]').html('<span class="badge bg-primary"><i class="fas fa-calendar-day mr-1" aria-hidden="true"></i>'+dataset.output.this.dom.date+' at '+dataset.output.this.dom.time+'</span>');
					} else { container.find('#calls_details').find('td[data-plugin="calls"][data-key="schedule"]').parent().remove(); }
					// Phone
					if(API.Auth.validate('custom', 'calls_phone', 1)){
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="phone"]').parent().show();
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="phone"]').html('<a class="btn btn-xs btn-success" href="tel:'+dataset.output.this.dom.phone+'"><i class="fas fa-phone mr-1"></i>'+dataset.output.this.dom.phone+'</a>');
					} else { container.find('#calls_details').find('td[data-plugin="calls"][data-key="phone"]').parent().remove(); }
					// User
					if(API.Auth.validate('custom', 'calls_users', 1)){
						container.find('#calls_details').find('a[data-plugin="calls"][data-key="user"]').parent().parent().show();
						container.find('#calls_details').find('td[data-plugin="calls"][data-key="user"]').html('<button class="btn btn-xs btn-primary"><i class="fas fa-user mr-1"></i>'+dataset.output.this.dom.assigned_to+'</button>');
					} else { container.find('#calls_details').find('a[data-plugin="calls"][data-key="user"]').parent().remove(); }
					// Created
					container.find('#calls_created').find('time').attr('datetime',dataset.output.this.raw.created.replace(/ /g, "T"));
					container.find('#calls_created').find('time').html(dataset.output.this.raw.created);
					container.find('#calls_created').find('time').timeago();
					// Issues
					for(var [relationshipsID, relations] of Object.entries(dataset.output.relationships)){
						for(var [key, relation] of Object.entries(relations)){
							if(relation.relationship == 'issues'){
								dataset.output.details.issues.dom[relation.link_to].status = dataset.output.details.statuses.dom[relation.statuses].order;
								dataset.output.details.issues.raw[relation.link_to].status = dataset.output.details.statuses.raw[relation.statuses].order;
							}
						}
					}
					// Notes
					if((API.Auth.validate('custom', 'calls_notes', 2))&&(dataset.output.this.raw.status < 4)){
						container.find('#calls_main_card_tabs .nav-item .nav-link[href="#calls_notes"]').parent().show();
						container.find('#calls_notes_textarea').find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						container.find('#calls_notes').find('button[data-action="reply"]').click(function(){
							var note = {
								by:API.Contents.Auth.User.id,
								content:container.find('#calls_notes_textarea').find('textarea').summernote('code'),
								relationship:'calls',
								link_to:dataset.output.this.dom.id,
							};
							container.find('#calls_notes_textarea').find('textarea').val('');
							container.find('#calls_notes_textarea').find('textarea').summernote('code','');
							container.find('#calls_notes_textarea').find('textarea').summernote('destroy');
							container.find('#calls_notes_textarea').find('textarea').summernote({
								toolbar: [
									['font', ['fontname', 'fontsize']],
									['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
									['color', ['color']],
									['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
								],
								height: 250,
							});
							if((note.content != "")&&(note.content != "<p><br></p>")&&(note.content != "<p></p>")&&(note.content != "<br>")){
								API.request('calls','note',{data:note},function(result){
									var data = JSON.parse(result);
									if(data.success != undefined){
										API.Builder.Timeline.add.card(container.find('#calls_timeline'),data.output.note.dom,'sticky-note','warning',function(item){
											item.find('.timeline-footer').remove();
										});
									}
								});
								container.find('#calls_main_card_tabs a[href="#calls"]').tab('show');
							} else { alert('Note is empty'); }
						});
					} else {
						container.find('#calls_main_card_tabs .nav-item .nav-link[href="#calls_notes"]').parent().remove();
						container.find('#calls_notes').remove();
					}
					// Creating Timeline
					// Adding items
					for(var [rid, relations] of Object.entries(dataset.output.relationships)){
						for(var [uid, relation] of Object.entries(relations)){
							if(API.Helper.isSet(dataset.output.details,[relation.relationship,'dom',relation.link_to])){
								var detail = {};
								for(var [key, value] of Object.entries(dataset.output.details[relation.relationship].dom[relation.link_to])){ detail[key] = value; }
								detail.owner = relation.owner; detail.created = relation.created;
								switch(relation.relationship){
									case"status":
									case"statuses":
										if((API.Auth.validate('custom', 'calls_status', 1))||(detail.owner == API.Contents.Auth.User.username)){
											API.Builder.Timeline.add.status(container.find('#calls_timeline'),detail);
										}
										break;
									case"organizations":
										if((API.Auth.validate('custom', 'calls_organizations', 1))||(detail.owner == API.Contents.Auth.User.username)){
											API.Builder.Timeline.add.client(container.find('#calls_timeline'),detail,'building');
										}
										break;
									case"contacts":
									case"users":
										detail.name = '';
										if((detail.first_name != '')&&(detail.first_name != null)){ if(detail.name != ''){detail.name += ' ';} detail.name += detail.first_name; }
										if((detail.middle_name != '')&&(detail.middle_name != null)){ if(detail.name != ''){detail.name += ' ';} detail.name += detail.middle_name; }
										if((detail.last_name != '')&&(detail.last_name != null)){ if(detail.name != ''){detail.name += ' ';} detail.name += detail.last_name; }
										if(detail.isContact){
											if((API.Auth.validate('custom', 'calls_contacts', 1))||(detail.owner == API.Contents.Auth.User.username)){
												API.Builder.Timeline.add.contact(container.find('#calls_timeline'),detail,'address-card');
											}
										} else if((API.Auth.validate('custom', 'calls_users', 1))||(detail.owner == API.Contents.Auth.User.username)){
											API.Builder.Timeline.add.user(container.find('#calls_timeline'),detail,'user','lightblue');
										}
										break;
									case"services":
										if((API.Auth.validate('custom', 'calls_services', 1))||(detail.owner == API.Contents.Auth.User.username)){
											API.Builder.Timeline.add.service(container.find('#calls_timeline'),detail);
										}
										break;
									case"issues":
										if((API.Auth.validate('custom', 'calls_issues', 1))||(detail.owner == API.Contents.Auth.User.username)){
											if(API.Helper.isSet(dataset.output.details.statuses.raw,[relation.statuses,'order'])){
												detail.status = dataset.output.details.statuses.raw[relation.statuses].order;
												API.Builder.Timeline.add.issue(container.find('#calls_timeline'),detail);
											}
										}
										break;
									case"notes":
										if((API.Auth.validate('custom', 'calls_notes', 1))||(detail.owner == API.Contents.Auth.User.username)){
											API.Builder.Timeline.add.card(container.find('#calls_timeline'),detail,'sticky-note','warning',function(item){
												item.find('.timeline-footer').remove();
											});
										}
										break;
									default:
										console.log(relation.relationship);
										API.Builder.Timeline.add.card(container.find('#calls_timeline'),detail);
										break;
								}
							}
						}
					}
					// Radio Selector
					var timelineHTML = '';
					timelineHTML += '<div class="btn-group btn-group-toggle" data-toggle="buttons">';
						timelineHTML += '<label class="btn btn-primary pointer active" data-table="all">';
							timelineHTML += '<input type="radio" name="options" autocomplete="off" checked>All';
						timelineHTML += '</label>';
						for(var [table, content] of Object.entries(dataset.output.details)){
							if(API.Auth.validate('custom', 'calls_'+table, 1)){
								timelineHTML += '<label class="btn btn-primary pointer" data-table="'+table+'">';
									timelineHTML += '<input type="radio" name="options" autocomplete="off">'+API.Helper.ucfirst(table);
								timelineHTML += '</label>';
							} else { console.log('calls_'+table); }
						}
					timelineHTML += '</div>';
					container.find('#calls_timeline').find('.time-label').first().html(timelineHTML);
					container.find('#calls_timeline').find('.time-label').first().find('label').each(function(){
						switch($(this).attr('data-table')){
							case"notes":var icon = 'sticky-note';break;
							case"comments":var icon = 'comment';break;
							case"statuses":var icon = 'info';break;
							case"users":var icon = 'user';break;
							case"organizations":var icon = 'building';break;
							case"contacts":var icon = 'address-card';break;
							case"calls":var icon = 'phone-square';break;
							case"services":var icon = 'hand-holding-usd';break;
							case"issues":var icon = 'gavel';break;
							default:var icon = '';break;
						}
						if((icon != '')&&(typeof icon !== 'undefined')){
							$(this).click(function(){
								container.find('#calls_timeline').find('[data-type]').hide();
								container.find('#calls_timeline').find('[data-type="'+icon+'"]').show();
							});
						} else {
							$(this).click(function(){
								container.find('#calls_timeline').find('[data-type]').show();
							});
						}
					});
					// Controls
					var callHTML = '';
					callHTML += '<thead>';
						callHTML += '<tr>';
							callHTML += '<th colspan="2">';
								callHTML += '<div class="btn-group btn-block" style="display:none">';
									callHTML += '<button class="btn btn-success" data-action="start"><i class="fas fa-phone mr-1"></i>Start</button>';
									callHTML += '<button class="btn btn-danger" data-action="cancel"><i class="fas fa-phone-slash mr-1"></i>Cancel</button>';
									callHTML += '<button class="btn btn-primary" data-action="reschedule"><i class="fas fa-calendar-day mr-1"></i>Re-Schedule</button>';
								callHTML += '</div>';
								callHTML += '<div class="btn-group btn-block" style="display:none">';
									callHTML += '<button class="btn btn-danger" data-action="end"><i class="fas fa-phone-slash mr-1"></i>End</button>';
								callHTML += '</div>';
							callHTML += '</th>';
						callHTML += '</tr>';
					callHTML += '</thead>';
					container.find('#calls_details').find('table').prepend(callHTML);
					if(dataset.output.this.raw.status <= 2){
						container.find('#calls_details').find('table').find('thead').find('.btn-group').first().show();
					}
					if(dataset.output.this.raw.status == 3){
						container.find('#calls_details').find('table').find('thead').find('.btn-group').last().show();
					}
					if(dataset.output.this.raw.status >= 4){
						container.find('#calls_details').find('table').find('thead').remove();
					}
					// Controls Events
					container.find('#calls_details').find('table').find('thead').find('button').each(function(){
						var control = $(this), action = $(this).attr('data-action');
						switch(action){
							case"start":
								control.click(function(){
									API.Plugins.calls.Events.start(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
										dataset.output.this.raw.status = data.call.raw.status;
										dataset.output.this.dom.status = data.call.dom.status;
									});
								});
								break;
							case"cancel":
								control.click(function(){
									API.Plugins.calls.Events.cancel(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
										dataset.output.this.raw.status = data.call.raw.status;
										dataset.output.this.dom.status = data.call.dom.status;
									});
								});
								break;
							case"reschedule":
								control.click(function(){
									API.Plugins.calls.Events.reschedule(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
										dataset.output.this.raw.status = data.call.raw.status;
										dataset.output.this.dom.status = data.call.dom.status;
									});
								});
								break;
							case"end":
								control.click(function(){
									API.Plugins.calls.Events.end(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
										dataset.output.this.raw.status = data.call.raw.status;
										dataset.output.this.dom.status = data.call.dom.status;
									});
								});
								break;
						}
					});
				}
			});
		},
	},
	Events:{
		start:function(call, organization, issues = {dom:[],raw:[]}, options = {}, callback = null){
			var callCTN = $('div[data-plugin="calls"][data-id="'+call.raw.id+'"]');
			var organizationCTN = $('div[data-plugin="organizations"][data-id="'+organization.raw.id+'"]');
			var trCTN = $('tr[data-id="'+call.raw.id+'"][data-type="calls"]');
			var widgetCTN = $('[data-type="callWidget"][data-id="'+call.dom.id+'"]').parents('.toastCallWidget');
			if(options instanceof Function){ callback = options; options = {}; }
			call.dom.status = 3;
			call.raw.status = 3;
			API.request('calls','start',{ data:call.raw },function(result){
				var data = JSON.parse(result);
				if(data.success != undefined){
					// Update Call Window
					if(callCTN.length > 0){
						// Adding Call Status to Timeline
						API.Builder.Timeline.add.status(callCTN.find('#calls_timeline'),data.output.status);
						// Update controls
						callCTN.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+data.output.status.color+'"><i class="'+data.output.status.icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[data.output.status.name]+'</span>');
						callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').first().hide();
						callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').last().show();
					}
					// Update Organization Window
					if(organizationCTN.length > 0){
						// Update Call Table
						if(trCTN.length > 0){
							trCTN.find('td').eq(1).html('<span class="mr-1 badge bg-'+API.Contents.Statuses.calls[call.raw.status].color+'"><i class="'+API.Contents.Statuses.calls[call.raw.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[call.raw.status].name]+'</span>');
							trCTN.parents().eq(4).find('#organizations_calls div table tbody').append(trCTN);
						}
						data.output.results.created = data.output.raw.modified;
						API.Builder.Timeline.add.call(organizationCTN.find('#organizations_timeline'),data.output.results,'phone-square','olive',function(item){
							item.find('i').first().addClass('pointer');
							item.find('i').first().off().click(function(){
								API.CRUD.read.show({ key:{id:data.output.results.id}, title:data.output.results.phone, href:"?p=calls&v=details&id="+data.output.results.id, modal:true });
							});
						});
						// Update controls
						if(((API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Auth.Options.application.showInlineCallsControls.value))||((!API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Settings.customization.showInlineCallsControls.value))){
							organizationCTN.find('[data-id][data-type="calls"]').find('td[data-showInlineCallsControls]').off();
							API.Plugins.organizations.Events.calls(organizationCTN,organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]'),call,organization,issues);
							organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]').find('button[data-action="start"]').parent().hide();
							organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]').find('button[data-action="end"]').parent().show();
						}
					}
					API.Plugins.calls.Widgets.toast(call,organization,issues);
					if(callback != null){ callback({call:call,issues:issues,organization:organization},{callCTN:callCTN,organizationCTN:organizationCTN,trCTN:trCTN,widgetCTN:widgetCTN}); }
				}
			});
		},
		cancel:function(call, organization, issues = {dom:[],raw:[]}, options = {}, callback = null){
			var callCTN = $('div[data-plugin="calls"][data-id="'+call.raw.id+'"]');
			var organizationCTN = $('div[data-plugin="organizations"][data-id="'+organization.raw.id+'"]');
			var trCTN = $('tr[data-id="'+call.raw.id+'"][data-type="calls"]');
			var widgetCTN = $('[data-type="callWidget"][data-id="'+call.dom.id+'"]').parents('.toastCallWidget');
			if(options instanceof Function){ callback = options; options = {}; }
			API.Builder.modal($('body'), {
				title:'Please explain why you are canceling the call',
				icon:'question',
				zindex:'top',
				css:{ dialog:"modal-lg",header:"bg-danger",body:'p-0'},
			}, function(modal){
				modal.on('hide.bs.modal',function(){ modal.remove(); });
				var dialog = modal.find('.modal-dialog');
				var header = modal.find('.modal-header');
				var body = modal.find('.modal-body');
				var footer = modal.find('.modal-footer');
				header.find('button[data-control="hide"]').remove();
				header.find('button[data-control="update"]').remove();
				body.html('<textarea id="cancelCallNote" title="Note" name="note" class="form-control"></textarea>');
				body.find('textarea').summernote({
					toolbar: [
						['font', ['fontname', 'fontsize']],
						['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
						['color', ['color']],
						['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
					],
					height: 250,
				});
				footer.append('<button class="btn btn-danger" data-action="cancel"><i class="fas fa-phone-slash mr-1"></i>Cancel</button>');
				footer.find('button[data-action="cancel"]').click(function(){
					var callUpdate = {};
					for(var [key, value] of Object.entries(call.raw)){ callUpdate[key] = value; };
					if(!body.find('textarea').summernote('isEmpty')){
						callUpdate.note = body.find('textarea').summernote('code');
						API.request('calls','cancel',{ data:callUpdate },function(result){
							var data = JSON.parse(result);
							if(data.success != undefined){
								call.dom.status = 6;
								call.raw.status = 6;
								// Update Call Window
								if(callCTN.length > 0){
									// Adding Call Status to Timeline
									API.Builder.Timeline.add.status(callCTN.find('#calls_timeline'),data.output.status);
									// Update controls
									callCTN.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+data.output.status.color+'"><i class="'+data.output.status.icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[data.output.status.name]+'</span>');
									callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').first().hide();
									callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').last().hide();
								}
								// Update Organization Window
								if(organizationCTN.length > 0){
									// Update Call Table
									if(trCTN.length > 0){
										trCTN.find('td').eq(1).html('<span class="mr-1 badge bg-'+API.Contents.Statuses.calls[call.raw.status].color+'"><i class="'+API.Contents.Statuses.calls[call.raw.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[call.raw.status].name]+'</span>');
										trCTN.parents().eq(4).find('#organizations_calls div table tbody').append(trCTN);
									}
									// Adding Call Status to Timeline
									data.output.results.created = data.output.raw.modified;
									API.Builder.Timeline.add.call(organizationCTN.find('#organizations_timeline'),data.output.results,'phone-square','olive',function(item){
										item.find('i').first().addClass('pointer');
										item.find('i').first().off().click(function(){
											API.CRUD.read.show({ key:{id:data.output.results.id}, title:data.output.results.phone, href:"?p=calls&v=details&id="+data.output.results.id, modal:true });
										});
									});
									// Adding Note
									if(API.Auth.validate('custom', 'organizations_notes', 1)){
									  API.Builder.Timeline.add.card(organizationCTN.find('#organizations_timeline'),data.output.note.dom,'sticky-note','warning',function(item){
									    item.find('.timeline-footer').remove();
									  });
									}
									// Update controls
									if(((API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Auth.Options.application.showInlineCallsControls.value))||((!API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Settings.customization.showInlineCallsControls.value))){
										organizationCTN.find('[data-id][data-type="calls"]').find('td[data-showInlineCallsControls]').off();
										API.Plugins.organizations.Events.calls(organizationCTN,organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]'),call,organization,issues);
										organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]').find('button[data-action="cancel"]').parent().hide();
									}
								}
								if(callback != null){ callback({call:call,issues:issues,organization:organization},{callCTN:callCTN,organizationCTN:organizationCTN,trCTN:trCTN,widgetCTN:widgetCTN}); }
							}
						});
						modal.modal('hide');
						callCTN.parents().eq(3).modal('hide');
					} else {
						body.find('textarea').summernote('destroy');
						body.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						alert('Note required!');
					}
				});
				modal.modal('show');
			});
		},
		reschedule:function(call, organization, issues = {dom:[],raw:[]}, options = {}, callback = null){
			var callCTN = $('div[data-plugin="calls"][data-id="'+call.raw.id+'"]');
			var organizationCTN = $('div[data-plugin="organizations"][data-id="'+organization.raw.id+'"]');
			var trCTN = $('tr[data-id="'+call.raw.id+'"][data-type="calls"]');
			var widgetCTN = $('[data-type="callWidget"][data-id="'+call.dom.id+'"]').parents('.toastCallWidget');
			if(options instanceof Function){ callback = options; options = {}; }
			API.Builder.modal($('body'), {
				title:'Why are you re-scheduling this call',
				icon:'question',
				zindex:'top',
				css:{ dialog:"modal-lg",header:"bg-primary",body:'p-0'},
			}, function(modal){
				modal.on('hide.bs.modal',function(){ modal.remove(); });
				var dialog = modal.find('.modal-dialog');
				var header = modal.find('.modal-header');
				var body = modal.find('.modal-body');
				var footer = modal.find('.modal-footer');
				header.find('button[data-control="hide"]').remove();
				header.find('button[data-control="update"]').remove();
				body.html('<div class="row"></div>');
				API.Builder.input(body.find('div.row'), 'date', null,{plugin:'calls'}, function(input){
					input.wrap('<div class="col-md-6 py-3 pl-4"></div>');
					API.Builder.input(body.find('div.row'), 'time', null,{plugin:'calls'}, function(input){
						input.wrap('<div class="col-md-6 py-3 pr-4"></div>');
						body.find('div.row').append('<div class="col-md-12"><textarea id="rescheduleCallNote" title="Note" name="note" class="form-control"></textarea></div>');
						body.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
					});
				});
				footer.append('<button class="btn btn-primary" data-action="reschedule"><i class="fas fa-calendar-day mr-1"></i>Re-Schedule</button>');
				footer.find('button[data-action="reschedule"]').click(function(){
					var callUpdate = {};
					for(var [key, value] of Object.entries(call.raw)){ callUpdate[key] = value; };
					if(!body.find('textarea').summernote('isEmpty')){ callUpdate.note = body.find('textarea').summernote('code'); }
					callUpdate.newdate = body.find('input[data-key="date"]').val();
					callUpdate.newtime = body.find('input[data-key="time"]').val();
					if((callUpdate.newdate != '')&&(callUpdate.newtime != '')){
						API.request('calls','reschedule',{ data:callUpdate },function(result){
							var data = JSON.parse(result);
							if(data.success != undefined){
								call.dom.status = 4;
								call.raw.status = 4;
								// Update Call Window
								if(callCTN.length > 0){
									// Adding Call Status to Timeline
									API.Builder.Timeline.add.status(callCTN.find('#calls_timeline'),data.output.status);
									// Update controls
									callCTN.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+data.output.status.color+'"><i class="'+data.output.status.icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[data.output.status.name]+'</span>');
									callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').first().hide();
									callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').last().hide();
								}
								// Update Organization Window
								if(organizationCTN.length > 0){
									// Update Call Table
									if(trCTN.length > 0){
										trCTN.find('td').eq(1).html('<span class="mr-1 badge bg-'+API.Contents.Statuses.calls[call.raw.status].color+'"><i class="'+API.Contents.Statuses.calls[call.raw.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[call.raw.status].name]+'</span>');
										trCTN.parents().eq(4).find('#organizations_calls div table tbody').append(trCTN);
									}
									// Adding Call Status to Timeline
									data.output.results.created = data.output.raw.modified;
									API.Builder.Timeline.add.call(organizationCTN.find('#organizations_timeline'),data.output.results,'phone-square','olive',function(item){
										item.find('i').first().addClass('pointer');
										item.find('i').first().off().click(function(){
											API.CRUD.read.show({ key:{id:data.output.results.id}, title:data.output.results.phone, href:"?p=calls&v=details&id="+data.output.results.id, modal:true });
										});
									});
									// Adding Note
									if(API.Auth.validate('custom', 'organizations_notes', 1)){
										if(API.Helper.isSet(data,['output','note','dom'])){
										  API.Builder.Timeline.add.card(organizationCTN.find('#organizations_timeline'),data.output.note.dom,'sticky-note','warning',function(item){
										    item.find('.timeline-footer').remove();
										  });
										}
									}
									// Update controls
									if(((API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Auth.Options.application.showInlineCallsControls.value))||((!API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Settings.customization.showInlineCallsControls.value))){
										organizationCTN.find('[data-id][data-type="calls"]').find('td[data-showInlineCallsControls]').off();
										API.Plugins.organizations.Events.calls(organizationCTN,organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]'),call,organization,issues);
										organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]').find('button[data-action="reschedule"]').parent().hide();
									}
									// Adding new Callback
									if(API.Helper.isSet(data.output,['new'])){
										API.Plugins.organizations.GUI.calls.add(organizationCTN,{dom:data.output.new.output.results,raw:data.output.new.output.raw},organization,issues, true);
									}
								}
								if(callback != null){ callback({call:call,issues:issues,organization:organization},{callCTN:callCTN,organizationCTN:organizationCTN,trCTN:trCTN,widgetCTN:widgetCTN}); }
							}
						});
						modal.modal('hide');
						callCTN.parents().eq(3).modal('hide');
					} else {
						body.find('textarea').summernote('destroy');
						body.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						alert('Date and time required!');
					}
				});
				modal.modal('show');
			});
		},
		end:function(call, organization, issues = {dom:[],raw:[]}, options = {}, callback = null){
			var callCTN = $('div[data-plugin="calls"][data-id="'+call.raw.id+'"]');
			var organizationCTN = $('div[data-plugin="organizations"][data-id="'+organization.raw.id+'"]');
			var trCTN = $('tr[data-id="'+call.raw.id+'"][data-type="calls"]');
			var widgetCTN = $('[data-type="callWidget"][data-id="'+call.raw.id+'"]').parents('.toastCallWidget');
			if(options instanceof Function){ callback = options; options = {}; }
			call.dom.status = 5;
			call.raw.status = 5;
			API.Builder.modal($('body'), {
				title:'Can you detail your call',
				icon:'question',
				zindex:'top',
				css:{ dialog:"modal-lg",header:"bg-danger",body:'p-0'},
			}, function(modal){
				modal.on('hide.bs.modal',function(){ modal.remove(); });
				var dialog = modal.find('.modal-dialog');
				var header = modal.find('.modal-header');
				var body = modal.find('.modal-body');
				var footer = modal.find('.modal-footer');
				header.find('button[data-control="hide"]').remove();
				header.find('button[data-control="update"]').remove();
				body.html('<div class="row"></div>');
				body.find('div.row').append('<div class="col-md-12"><textarea id="rescheduleCallNote" title="Note" name="note" class="form-control"></textarea></div>');
				body.find('textarea').summernote({
					toolbar: [
						['font', ['fontname', 'fontsize']],
						['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
						['color', ['color']],
						['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
					],
					height: 250,
				});
				var side = 'pr', count = 0, top = 'py';
				for(var [issueID, issue] of Object.entries(issues.dom)){
					count++;
					if(count > 2){ top = 'pb'; }
					if(side == 'pl'){ side = 'pr'; } else { side = 'pl'; }
					var issueHTML = '';
					issueHTML += '<div class="col-md-6 '+top+'-3 '+side+'-4" data-issue="'+issue.id+'">';
						issueHTML += '<div class="input-group">';
							issueHTML += '<div class="input-group-prepend">';
								issueHTML += '<span class="input-group-text"><i class="fas fa-gavel mr-1"></i>'+issue.id+' - '+issue.name+'</span>';
							issueHTML += '</div>';
							issueHTML += '<select title="'+issue.id+' - '+issue.name+'" class="form-control select2bs4 select2-hidden-accessible" name="'+issue.id+'">';
							for(var [statusOrder, status] of Object.entries(API.Contents.Statuses.issues)){
								if(issue.status == statusOrder){
									issueHTML += '<option value="'+statusOrder+'" selected="selected">'+API.Contents.Language[status.name]+'</option>';
								} else {
									issueHTML += '<option value="'+statusOrder+'">'+API.Contents.Language[status.name]+'</option>';
								}
							}
							issueHTML += '</select>';
						issueHTML += '</div>';
					issueHTML += '</div>';
					body.find('div.row').append(issueHTML);
				}
				body.find('select').select2({ theme: 'bootstrap4' });
				footer.append('<div class="btn-group"></div>');
				footer.find('div.btn-group').append('<button class="btn btn-primary" data-action="reschedule"><i class="fas fa-calendar-day mr-1"></i>Re-Schedule</button>');
				footer.find('div.btn-group').append('<button class="btn btn-danger" data-action="end"><i class="fas fa-phone-slash mr-1"></i>End</button>');
				footer.find('button[data-action="reschedule"]').click(function(){
					var form = {issues:{}};
					if(!body.find('textarea').summernote('isEmpty')){
						form.note = body.find('textarea').summernote('code');
						body.find('textarea').summernote('destroy');
						body.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						for(var [issueID, issue] of Object.entries(issues.dom)){
							form.issues[issueID] = body.find('div[data-issue="'+issueID+'"]').find('select').select2('val');
						}
						var noteModal = modal;
						API.Builder.modal($('body'), {
							title:'Select a date and time',
							icon:'question',
							zindex:'top',
							css:{ dialog:"modal-lg",header:"bg-primary",body:'p-0'},
						}, function(modal){
							modal.on('hide.bs.modal',function(){ modal.remove(); });
							var dialog = modal.find('.modal-dialog');
							var header = modal.find('.modal-header');
							var body = modal.find('.modal-body');
							var footer = modal.find('.modal-footer');
							header.find('button[data-control="hide"]').remove();
							header.find('button[data-control="update"]').remove();
							body.html('<div class="row"></div>');
							API.Builder.input(body.find('div.row'), 'date', null,{plugin:'calls'}, function(input){
								input.wrap('<div class="col-md-6 py-3 pl-4"></div>');
								API.Builder.input(body.find('div.row'), 'time', null,{plugin:'calls'}, function(input){
									input.wrap('<div class="col-md-6 py-3 pr-4"></div>');
								});
							});
							footer.append('<button class="btn btn-primary" data-action="reschedule"><i class="fas fa-calendar-day mr-1"></i>Re-Schedule</button>');
							footer.find('button[data-action="reschedule"]').click(function(){
								call.dom.status = 4;
								call.raw.status = 4;
								form.date = body.find('input[data-key="date"]').val();
								form.time = body.find('input[data-key="time"]').val();
								if((form.date != '')&&(form.time != '')){
									var callUpdate = {};
									for(var [key, value] of Object.entries(call.raw)){ callUpdate[key] = value; };
									callUpdate.form = form;
									API.request('calls','end',{ data:callUpdate },function(result){
										var data = JSON.parse(result);
										if(data.success != undefined){
											// Update Call Window
											if(callCTN.length > 0){
												// Adding Call Status to Timeline
												API.Builder.Timeline.add.status(callCTN.find('#calls_timeline'),data.output.status);
												// Update controls
												callCTN.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+data.output.status.color+'"><i class="'+data.output.status.icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[data.output.status.name]+'</span>');
												callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').first().hide();
												callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').last().hide();
												// Adding Issues
												if(API.Helper.isSet(data.output,['issues'])){
													for(var [issueID, issue] of Object.entries(data.output.issues)){
														issue.created = data.output.note.dom.created;
														issue.status = issue.status.order;
														API.Builder.Timeline.add.issue(callCTN.find('#calls_timeline'),issue);
													}
												}
												// Adding Services
												if(API.Helper.isSet(data.output,['issues'])){
													for(var [serviceID, service] of Object.entries(data.output.services)){
														service.created = data.output.note.dom.created;
														API.Builder.Timeline.add.service(callCTN.find('#calls_timeline'),service);
													}
												}
											}
											// Update Organization Window
											if(organizationCTN.length > 0){
												// Update Call Table
												if(trCTN.length > 0){
													trCTN.find('td').eq(1).html('<span class="mr-1 badge bg-'+API.Contents.Statuses.calls[call.raw.status].color+'"><i class="'+API.Contents.Statuses.calls[call.raw.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[call.raw.status].name]+'</span>');
												}
												// Adding Call Status to Timeline
												data.output.results.created = data.output.raw.modified;
												API.Builder.Timeline.add.call(organizationCTN.find('#organizations_timeline'),data.output.results,'phone-square','olive',function(item){
													item.find('i').first().addClass('pointer');
													item.find('i').first().off().click(function(){
														API.CRUD.read.show({ key:{id:data.output.results.id}, title:data.output.results.phone, href:"?p=calls&v=details&id="+data.output.results.id, modal:true });
													});
												});
												// Adding Note
												if(API.Auth.validate('custom', 'organizations_notes', 1)){
													if(API.Helper.isSet(data,['output','note','dom'])){
													  API.Builder.Timeline.add.card(organizationCTN.find('#organizations_timeline'),data.output.note.dom,'sticky-note','warning',function(item){
													    item.find('.timeline-footer').remove();
													  });
													}
												}
												// Update controls
												if(((API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Auth.Options.application.showInlineCallsControls.value))||((!API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Settings.customization.showInlineCallsControls.value))){
													organizationCTN.find('[data-id][data-type="calls"]').find('td[data-showInlineCallsControls]').off();
													API.Plugins.organizations.Events.calls(organizationCTN,organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]'),call,organization,issues);
													organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]').find('button[data-action="end"]').parent().hide();
												}
												// Adding new Callback
												if(API.Helper.isSet(data.output,['new'])){
													API.Plugins.organizations.GUI.calls.add(organizationCTN,{dom:data.output.new.output.results,raw:data.output.new.output.raw},organization,issues, true);
												}
												// Adding Issues
												if(API.Helper.isSet(data.output,['issues'])){
													for(var [issueID, issue] of Object.entries(data.output.issues)){
														issue.created = data.output.note.dom.created;
														issue.status = issue.status.order;
														API.Builder.Timeline.add.issue(organizationCTN.find('#organizations_timeline'),issue);
													}
												}
												// Adding Services
												if(API.Helper.isSet(data.output,['issues'])){
													for(var [serviceID, service] of Object.entries(data.output.services)){
														service.created = data.output.note.dom.created;
														API.Builder.Timeline.add.service(organizationCTN.find('#organizations_timeline'),service);
														var serviceHTML = '';
														serviceHTML += '<div class="btn-group m-1" data-id="'+serviceID+'">';
															serviceHTML += '<button type="button" data-id="'+serviceID+'" data-action="details" class="btn btn-xs btn-primary"><i class="fas fa-hand-holding-usd mr-1"></i>'+service.name+'</button>';
															serviceHTML += '<button type="button" data-id="'+serviceID+'" data-action="unlink" class="btn btn-xs btn-danger"><i class="fas fa-unlink"></i></button>';
														serviceHTML += '</div>';
														organizationCTN.find('td[data-plugin="organizations"][data-key="services"]').find('button[data-action="link"]').before(serviceHTML);
													}
												}
											}
											// Update Widget Window
											if(widgetCTN.length > 0){widgetCTN.remove();}
											if(callback != null){ callback({call:call,issues:issues,organization:organization},{callCTN:callCTN,organizationCTN:organizationCTN,trCTN:trCTN,widgetCTN:widgetCTN}); }
										}
									});
									modal.modal('hide');
									noteModal.modal('hide');
									callCTN.parents().eq(3).modal('hide');
								} else { alert('Date and time required!'); }
							});
							modal.modal('show');
						});
					} else {
						body.find('textarea').summernote('destroy');
						body.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						alert('Note required!');
					}
				});
				footer.find('button[data-action="end"]').click(function(){
					var form = {issues:{}};
					if(!body.find('textarea').summernote('isEmpty')){
						form.note = body.find('textarea').summernote('code');
						for(var [issueID, issue] of Object.entries(issues.dom)){
							form.issues[issueID] = body.find('div[data-issue="'+issueID+'"]').find('select').select2('val');
						}
						var callUpdate = {};
						for(var [key, value] of Object.entries(call.raw)){ callUpdate[key] = value; };
						callUpdate.form = form;
						API.request('calls','end',{ data:callUpdate },function(result){
							var data = JSON.parse(result);
							if(data.success != undefined){
								// Update Call Window
								if(callCTN.length > 0){
									// Adding Call Status to Timeline
									API.Builder.Timeline.add.status(callCTN.find('#calls_timeline'),data.output.status);
									// Update controls
									callCTN.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+data.output.status.color+'"><i class="'+data.output.status.icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[data.output.status.name]+'</span>');
									callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').first().hide();
									callCTN.find('#calls_details').find('table').find('thead').find('.btn-group').last().hide();
									// Adding Issues
									if(API.Helper.isSet(data.output,['issues'])){
										for(var [issueID, issue] of Object.entries(data.output.issues)){
											issue.created = data.output.note.dom.created;
											issue.status = issue.status.order;
											API.Builder.Timeline.add.issue(callCTN.find('#calls_timeline'),issue);
										}
									}
									// Adding Services
									if(API.Helper.isSet(data.output,['issues'])){
										for(var [serviceID, service] of Object.entries(data.output.services)){
											service.created = data.output.note.dom.created;
											API.Builder.Timeline.add.service(callCTN.find('#calls_timeline'),service);
										}
									}
								}
								// Update Organization Window
								if(organizationCTN.length > 0){
									// Update Call Table
									if(trCTN.length > 0){
										trCTN.find('td').eq(1).html('<span class="mr-1 badge bg-'+API.Contents.Statuses.calls[call.raw.status].color+'"><i class="'+API.Contents.Statuses.calls[call.raw.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[call.raw.status].name]+'</span>');
									}
									// Adding Call Status to Timeline
									data.output.results.created = data.output.raw.modified;
									API.Builder.Timeline.add.call(organizationCTN.find('#organizations_timeline'),data.output.results,'phone-square','olive',function(item){
										item.find('i').first().addClass('pointer');
										item.find('i').first().off().click(function(){
											API.CRUD.read.show({ key:{id:data.output.results.id}, title:data.output.results.phone, href:"?p=calls&v=details&id="+data.output.results.id, modal:true });
										});
									});
									// Adding Note
									if(API.Auth.validate('custom', 'organizations_notes', 1)){
										if(API.Helper.isSet(data,['output','note','dom'])){
											API.Builder.Timeline.add.card(organizationCTN.find('#organizations_timeline'),data.output.note.dom,'sticky-note','warning',function(item){
												item.find('.timeline-footer').remove();
											});
										}
									}
									// Update controls
									if(((API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Auth.Options.application.showInlineCallsControls.value))||((!API.Helper.isSet(API.Contents.Auth.Options,['application','showInlineCallsControls','value']))&&(API.Contents.Settings.customization.showInlineCallsControls.value))){
										organizationCTN.find('[data-id][data-type="calls"]').find('td[data-showInlineCallsControls]').off();
										API.Plugins.organizations.Events.calls(organizationCTN,organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]'),call,organization,issues);
										organizationCTN.find('[data-id="'+call.dom.id+'"][data-type="calls"]').find('button[data-action="end"]').parent().hide();
									}
									// Adding new Callback
									if(API.Helper.isSet(data.output,['new'])){
										API.Plugins.organizations.GUI.calls.add(organizationCTN,{dom:data.output.new.output.results,raw:data.output.new.output.raw},organization,issues, true);
									}
									// Adding Issues
									if(API.Helper.isSet(data.output,['issues'])){
										for(var [issueID, issue] of Object.entries(data.output.issues)){
											issue.created = data.output.note.dom.created;
											issue.status = issue.status.order;
											API.Builder.Timeline.add.issue(organizationCTN.find('#organizations_timeline'),issue);
										}
									}
									// Adding Services
									if(API.Helper.isSet(data.output,['issues'])){
										for(var [serviceID, service] of Object.entries(data.output.services)){
											service.created = data.output.note.dom.created;
											API.Builder.Timeline.add.service(organizationCTN.find('#organizations_timeline'),service);
											var serviceHTML = '';
											serviceHTML += '<div class="btn-group m-1" data-id="'+serviceID+'">';
												serviceHTML += '<button type="button" data-id="'+serviceID+'" data-action="details" class="btn btn-xs btn-primary"><i class="fas fa-hand-holding-usd mr-1"></i>'+service.name+'</button>';
												serviceHTML += '<button type="button" data-id="'+serviceID+'" data-action="unlink" class="btn btn-xs btn-danger"><i class="fas fa-unlink"></i></button>';
											serviceHTML += '</div>';
											organizationCTN.find('td[data-plugin="organizations"][data-key="services"]').find('button[data-action="link"]').before(serviceHTML);
										}
									}
								}
								// Update Widget Window
								if(widgetCTN.length > 0){widgetCTN.remove();}
								if(callback != null){ callback({call:call,issues:issues,organization:organization},{callCTN:callCTN,organizationCTN:organizationCTN,trCTN:trCTN,widgetCTN:widgetCTN}); }
							}
						});
						modal.modal('hide');
						callCTN.parents().eq(3).modal('hide');
					} else {
						body.find('textarea').summernote('destroy');
						body.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						alert('Note required!');
					}
				});
				modal.modal('show');
			});
		},
	},
	Widgets:{
		toast:function(call, organization, issues = {dom:[],raw:[]}, options = {}, callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			if((call.raw.assigned_to == API.Contents.Auth.User.id)&&(((API.Helper.isSet(API.Contents.Auth.Options,['application','showCallWidget','value']))&&(API.Contents.Auth.Options.application.showCallWidget.value))||((!API.Helper.isSet(API.Contents.Auth.Options,['application','showCallWidget','value']))&&(API.Contents.Settings.customization.showCallWidget.value)))){
				var toastHTML = '';
				toastHTML += '<div class="row" data-type="callWidget" data-id="'+call.dom.id+'">';
					toastHTML += '<div class="col-8">';
						toastHTML += '<a class="btn btn-sm btn-block btn-success"><i class="fas fa-phone-alt mr-2"></i>'+call.dom.phone+'</a>';
					toastHTML += '</div>';
					toastHTML += '<div class="col-4">';
						toastHTML += '<button type="button" class="btn btn-sm btn-block btn-danger"><i class="fas fa-phone-slash mr-2"></i>End</button>';
					toastHTML += '</div>';
				toastHTML += '</div>';
				if($('[data-type="callWidget"][data-id="'+call.dom.id+'"]').length <= 0){
					if(call.raw.status == 3){
						var title = 'Active Call - ';
						if((typeof organization.dom.name !== 'undefined')&&(organization.dom.name != '')&&(organization.dom.name != null)){ title += organization.dom.name; }
						if((typeof call.dom.contact !== 'undefined')&&(call.dom.contact != '')&&(call.dom.contact != null)){ title += ' - '+call.dom.contact; }
						$(document).Toasts('create', {
							icon: 'fas fa-phone-square-alt fa-lg',
							fade: true,
							close: false,
							class: 'toastCallWidget',
							title: title,
							position: 'bottomRight',
							body: toastHTML
						});
						var checkWidgets = setInterval(function() {
							if($('[data-type="callWidget"]').length > 0){
								clearInterval(checkWidgets);
								var checkWidget = setInterval(function() {
									if($('[data-type="callWidget"][data-id="'+call.dom.id+'"]').length > 0){
										clearInterval(checkWidget);
										var toast = $('[data-type="callWidget"][data-id="'+call.dom.id+'"]').parents('.toastCallWidget');
										toast.find('a').off().click(function(){
											API.CRUD.read.show({ key:'name',keys:organization.dom, href:"?p=organizations&v=details&id="+organization.dom.name, modal:true });
										});
										toast.find('button').off().click(function(){
											API.Plugins.calls.Events.end(call,organization,issues,function(data,objects){
												call.raw.status = data.call.raw.status;
												call.dom.status = data.call.dom.status;
											});
										});
										if(callback != null){ callback(toast); }
									}
								}, 100);
							}
						}, 100);
					}
				}
			}
		},
	},
	extend:{},
}

API.Plugins.calls.init();
