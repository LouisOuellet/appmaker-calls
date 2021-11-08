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
				API.Plugins.calls.GUI.toast.init();
				API.request('calls','getActive',{report:true,toast:false},function(result){
					var dataset = JSON.parse(result);
					if(dataset.success != undefined){
						for(var [id, call] of Object.entries(dataset.output.calls.raw)){
							API.Plugins.calls.GUI.widget(dataset.output.organizations[call.organization]['output'],call);
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
						for(var [key, value] of Object.entries(dataset.output.dom)){ API.Helper.set(API.Contents,['data','dom','calls',value.id],value); }
						for(var [key, value] of Object.entries(dataset.output.raw)){ API.Helper.set(API.Contents,['data','raw','calls',value.id],value); }
						API.Builder.table(card.children('.card-body'), dataset.output.dom, {
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
			var id = url.searchParams.get("id");
			API.request(url.searchParams.get("p"),'get',{data:{id:id,key:'id'}},function(result){
				var dataset = JSON.parse(result);
				if(dataset.success != undefined){
					container.attr('data-id',dataset.output.this.raw.id);
					// GUI
					// Adding Layout
					API.GUI.Layouts.details.build(dataset.output,container,{title:"Call Details",image:"/dist/img/default.png"},function(data,layout){
						// History
						API.GUI.Layouts.details.tab(data,layout,{icon:"fas fa-history",text:API.Contents.Language["History"]},function(data,layout,tab,content){
							API.Helper.set(API.Contents,['layouts','calls',data.this.raw.id,layout.main.attr('id')],layout);
							content.addClass('p-3');
							content.append('<div class="timeline" data-plugin="calls"></div>');
							layout.timeline = content.find('div.timeline');
							var today = new Date();
							API.Builder.Timeline.add.date(layout.timeline,today);
							layout.timeline.find('.time-label').first().html('<div class="btn-group"></div>');
							layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-primary" data-table="all">'+API.Contents.Language['All']+'</button>');
							var options = {plugin:"calls"}
							// Debug
							if(API.debug){
								API.GUI.Layouts.details.button(data,layout,{icon:"fas fa-stethoscope"},function(data,layout,button){
									button.off().click(function(){
										console.log(data);
										console.log(layout);
									});
								});
							}
							// Clear
							if(API.Auth.validate('custom', 'calls_clear', 1)){
								API.GUI.Layouts.details.control(data,layout,{color:"danger",icon:"fas fa-snowplow",text:API.Contents.Language["Clear"]},function(data,layout,button){
									button.off().click(function(){
										API.request('calls','clear',{ data:data.this.raw },function(){
											API.Plugins.calls.load.details();
										});
									});
								});
							}
							// Subscription
							var icon = "fas fa-bell";
							if(API.Helper.isSet(data,['relations','users',API.Contents.Auth.User.id])){ var icon = "fas fa-bell-slash"; }
							API.GUI.Layouts.details.button(data,layout,{icon:icon},function(data,layout,button){
								button.off().click(function(){
									if(button.find('i').hasClass( "fa-bell" )){
										button.find('i').removeClass("fa-bell").addClass("fa-bell-slash");
										API.request("calls",'subscribe',{data:{id:data.this.raw.id}},function(answer){
											var subscription = JSON.parse(answer);
											if(subscription.success != undefined){
												var sub = {};
												for(var [key, value] of Object.entries(API.Contents.Auth.User)){ sub[key] = value; }
												sub.created = subscription.output.relationship.created;
												sub.name = '';
												if((sub.first_name != '')&&(sub.first_name != null)){ if(sub.name != ''){sub.name += ' ';} sub.name += sub.first_name; }
												if((sub.middle_name != '')&&(sub.middle_name != null)){ if(sub.name != ''){sub.name += ' ';} sub.name += sub.middle_name; }
												if((sub.last_name != '')&&(sub.last_name != null)){ if(sub.name != ''){sub.name += ' ';} sub.name += sub.last_name; }
												API.Builder.Timeline.add.subscription(layout.timeline,sub,'bell','lightblue',function(item){
													if((API.Auth.validate('plugin','users',1))&&(API.Auth.validate('view','details',1,'users'))){
														item.find('i').first().addClass('pointer');
														item.find('i').first().off().click(function(){
															API.CRUD.read.show({ key:'username',keys:data.relations.users[item.attr('data-id')], href:"?p=users&v=details&id="+data.relations.users[item.attr('data-id')].username, modal:true });
														});
													}
												});
											}
										});
									} else {
										button.find('i').removeClass("fa-bell-slash").addClass("fa-bell");
										API.request(url.searchParams.get("p"),'unsubscribe',{data:{id:dataset.output.this.raw.id}},function(answer){
											var subscription = JSON.parse(answer);
											if(subscription.success != undefined){
												layout.timeline.find('[data-type="bell"][data-id="'+API.Contents.Auth.User.id+'"]').remove();
											}
										});
									}
								});
							});
							// Name
							if(data.this.dom.contact != ''){
								options.field = "contact";
								layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="contacts">'+API.Contents.Language['Contacts']+'</button>');
							} else { options.field = "organization"; }
							if(API.Helper.isSet(options,['td'])){ delete options.td; }
							API.GUI.Layouts.details.data(data,layout,options);
							// Organization
							layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="organizations">'+API.Contents.Language['Organizations']+'</button>');
							// Controls
							if(data.this.raw.status <= 2){
								// Callback
								API.GUI.Layouts.details.control(data,layout,{color:"success",icon:"fas fa-phone",text:API.Contents.Language["Start"]},function(data,layout,button){
									button.off().click(function(){
										API.Plugins.calls.Events.start(data.organization.output,data.this.raw);
									});
								});
								API.GUI.Layouts.details.control(data,layout,{color:"danger",icon:"fas fa-phone-slash",text:API.Contents.Language["Cancel"]},function(data,layout,button){
									button.off().click(function(){
										API.Plugins.calls.Events.cancel(data.organization.output,data.this.raw);
									});
								});
								API.GUI.Layouts.details.control(data,layout,{color:"primary",icon:"fas fa-calendar-day",text:API.Contents.Language["Re-Schedule"]},function(data,layout,button){
									button.off().click(function(){
										API.Plugins.calls.Events.reschedule(data.organization.output,data.this.raw);
									});
								});
							} else if(data.this.raw.status <= 3) {
								// Call
								API.GUI.Layouts.details.control(data,layout,{color:"danger",icon:"fas fa-phone-slash",text:API.Contents.Language["End"]},function(data,layout,button){
									button.off().click(function(){
										API.Plugins.calls.Events.end(data.organization.output,data.this.raw);
									});
								});
							}
							// Status
							if(API.Helper.isSet(API.Plugins,['statuses']) && API.Auth.validate('custom', 'calls_status', 1)){
								layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="statuses">'+API.Contents.Language['Status']+'</button>');
								options.field = "status";
								options.td = '';
								options.td += '<td data-plugin="calls" data-key="'+options.field+'">';
									if(API.Helper.isSet(API.Contents.Statuses,['calls',data.this.raw.status])){
										options.td += '<span class="badge bg-'+API.Contents.Statuses.calls[data.this.raw.status].color+'">';
											options.td += '<i class="'+API.Contents.Statuses.calls[data.this.raw.status].icon+' mr-1"></i>'+API.Contents.Statuses.calls[data.this.raw.status].name+'';
										options.td += '</span>';
									}
								options.td += '</td>';
								API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){});
							}
							// Schedule
							if(API.Auth.validate('custom', 'calls_schedule', 1)){
								options.field = "schedule";
								options.td = '';
								options.td += '<td data-plugin="calls" data-key="'+options.field+'">';
									options.td += '<span class="badge bg-primary">';
										options.td += '<i class="fas fa-calendar-day mr-1"></i>'+data.this.dom.date+API.Contents.Language[' at ']+data.this.dom.time;
									options.td += '</span>';
								options.td += '</td>';
								API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){});
							}
							// Phone
							if(API.Auth.validate('custom', 'calls_phone', 1)){
								options.field = "phone";
								options.td = '';
								options.td += '<td data-plugin="calls" data-key="'+options.field+'">';
									options.td += '<span class="badge bg-success">';
										options.td += '<i class="fas fa-phone mr-1"></i>'+data.this.dom.phone;
									options.td += '</span>';
								options.td += '</td>';
								API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){});
							}
							// Users
							if(API.Helper.isSet(API.Plugins,['users']) && API.Auth.validate('custom', 'calls_users', 1)){
								layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="users">'+API.Contents.Language['Users']+'</button>');
								options.field = "assigned_to";
								options.td = '<td data-plugin="calls" data-key="'+options.field+'"></td>';
								API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){
									var td = tr.find('td[data-plugin="calls"][data-key="assigned_to"]');
									if(API.Helper.isSet(data.details,['users'])){
										if(data.this.raw.assigned_to == null){ data.this.raw.assigned_to = ''; }
										for(var [subKey, subDetails] of Object.entries(API.Helper.trim(data.this.raw.assigned_to,';').split(';'))){
											if(subDetails != ''){
												var user = data.details.users.dom[subDetails];
												td.append(
													API.Plugins.calls.GUI.buttons.details(user,{
														remove:API.Auth.validate('custom', 'calls_users', 4),
														key: "username",
														icon:{
															details:"fas fa-user",
															remove:"fas fa-user-minus",
														},
														action:{
															remove:"unassign",
														},
													})
												);
											}
										}
									}
									if(API.Auth.validate('custom', 'calls_users', 2)){
										td.append('<button type="button" class="btn btn-xs btn-success mx-1" data-action="assign"><i class="fas fa-user-plus"></i></button>');
									}
									API.Plugins.calls.Events.users(data,layout);
								});
							}
							// Services
							if(API.Helper.isSet(API.Plugins,['services']) && API.Auth.validate('custom', 'calls_services', 1)){
								layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="services">'+API.Contents.Language['Services']+'</button>');
								options.field = "services";
								if(API.Helper.isSet(options,['td'])){ delete options.td; }
								API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){
									var td = tr.find('td[data-plugin="calls"][data-key="services"]');
									if(API.Helper.isSet(data.details,['services'])){
										for(var [subKey, subDetails] of Object.entries(data.details.services.dom)){
											td.append(API.Plugins.calls.GUI.buttons.details(subDetails,{remove:API.Auth.validate('custom', 'calls_services', 4),icon:{details:"fas fa-hand-holding-usd"}}));
										}
									}
									if(API.Auth.validate('custom', 'calls_services', 2)){
										td.append('<button type="button" class="btn btn-xs btn-success mx-1" data-action="link"><i class="fas fa-link"></i></button>');
									}
									API.Plugins.calls.Events.services(data,layout);
								});
							}
							// Issues
							if(API.Helper.isSet(API.Plugins,['issues']) && API.Auth.validate('custom', 'calls_issues', 1)){
								layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="issues">'+API.Contents.Language['Issues']+'</button>');
								options.field = "issues";
								if(API.Helper.isSet(options,['td'])){ delete options.td; }
								var issues = {};
								for(var [rid, relations] of Object.entries(data.relationships)){
									for(var [uid, relation] of Object.entries(relations)){
										if(relation.relationship == 'issues'){ issues[relation.link_to] = relation.statuses; }
									}
								}
								API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){
									var td = tr.find('td[data-plugin="calls"][data-key="issues"]');
									if(API.Helper.isSet(data.details,['issues'])){
										for(var [subKey, subDetails] of Object.entries(data.relations.issues)){
											td.append(
												API.Plugins.calls.GUI.buttons.details(subDetails,{
													remove:API.Auth.validate('custom', 'calls_issues', 4),
													content:subDetails.id+' - '+subDetails.name+' - '+API.Contents.Language[API.Contents.Statuses.issues[subDetails.status].name],
													color:{
														details:API.Contents.Statuses.issues[subDetails.status].color
													},
													icon:{
														details:API.Contents.Statuses.issues[subDetails.status].icon
													},
												})
											);
										}
									}
									if(API.Auth.validate('custom', 'calls_issues', 2)){
										td.append('<button type="button" class="btn btn-xs btn-success mx-1" data-action="link"><i class="fas fa-link"></i></button>');
									}
									API.Plugins.calls.Events.issues(data,layout);
								});
							}
							// Created
							options.field = "created";
							options.td = '<td><time class="timeago" datetime="'+data.this.raw.created.replace(/ /g, "T")+'" title="'+data.this.raw.created+'">'+data.this.raw.created+'</time></td>';
							API.GUI.Layouts.details.data(data,layout,options,function(data,layout,tr){ tr.find('time').timeago(); });
							// Notes
							if(API.Helper.isSet(API.Plugins,['notes']) && API.Auth.validate('custom', 'calls_notes', 1)){
								API.GUI.Layouts.details.tab(data,layout,{icon:"fas fa-sticky-note",text:API.Contents.Language["Notes"]},function(data,layout,tab,content){
									layout.timeline.find('.time-label').first().find('div.btn-group').append('<button class="btn btn-secondary" data-table="notes">'+API.Contents.Language['Notes']+'</button>');
									layout.content.notes = content;
									layout.tabs.notes = tab;
									if(API.Auth.validate('custom', 'calls_notes', 2)){
										content.append('<div><textarea title="Note" name="note" class="form-control"></textarea></div>');
										content.find('textarea').summernote({
											toolbar: [
												['font', ['fontname', 'fontsize']],
												['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
												['color', ['color']],
												['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
											],
											height: 250,
										});
										var html = '';
										html += '<nav class="navbar navbar-expand-lg navbar-dark bg-dark">';
											html += '<form class="form-inline my-2 my-lg-0 ml-auto">';
												html += '<button class="btn btn-warning my-2 my-sm-0" type="button" data-action="reply"><i class="fas fa-sticky-note mr-1"></i>'+API.Contents.Language['Add Note']+'</button>';
											html += '</form>';
										html += '</nav>';
										content.append(html);
									}
								});
								API.Plugins.calls.Events.notes(data,layout);
							}
							// Timeline
							for(var [rid, relations] of Object.entries(data.relationships)){
								for(var [uid, relation] of Object.entries(relations)){
									if(API.Helper.isSet(API.Plugins,[relation.relationship]) && (API.Auth.validate('custom', 'calls_'+relation.relationship, 1) || relation.owner == API.Contents.Auth.User.username) && API.Helper.isSet(data,['relations',relation.relationship,relation.link_to])){
										var details = {};
										for(var [key, value] of Object.entries(data.relations[relation.relationship][relation.link_to])){ details[key] = value; }
										if(typeof relation.statuses !== 'undefined'){ details.status = data.details.statuses.dom[relation.statuses].order; }
										details.created = relation.created;
										details.owner = relation.owner;
										if(!API.Helper.isSet(details,['isActive'])||(API.Helper.isSet(details,['isActive']) && details.isActive)||(API.Helper.isSet(details,['isActive']) && !details.isActive && (API.Auth.validate('custom', 'calls_'+relation.relationship+'_isActive', 1)||API.Auth.validate('custom', relation.relationship+'_isActive', 1)))){
											switch(relation.relationship){
												case"statuses":
													API.Builder.Timeline.add.status(layout.timeline,details);
													break;
												case"organizations":
													API.Builder.Timeline.add.client(layout.timeline,details,'building','secondary',function(item){
														if((API.Auth.validate('plugin','organizations',1))&&(API.Auth.validate('view','details',1,'organizations'))){
															item.find('i').first().addClass('pointer');
															item.find('i').first().off().click(function(){
																API.CRUD.read.show({ key:'name',keys:data.details.organizations.dom[item.attr('data-id')], href:"?p=organizations&v=details&id="+data.details.organizations.dom[item.attr('data-id')].name, modal:true });
															});
														}
													});
													break;
												case"services":
													API.Builder.Timeline.add.service(layout.timeline,details,'hand-holding-usd','success',function(item){
														if((API.Auth.validate('plugin','services',1))&&(API.Auth.validate('view','details',1,'services'))){
															item.find('i').first().addClass('pointer');
															item.find('i').first().off().click(function(){
																API.CRUD.read.show({ key:'name',keys:data.details.services.dom[item.attr('data-id')], href:"?p=services&v=details&id="+data.details.services.dom[item.attr('data-id')].name, modal:true });
															});
														}
													});
													break;
												case"issues":
													API.Builder.Timeline.add.issue(layout.timeline,details,'gavel','indigo',function(item){
														if((API.Auth.validate('plugin','issues',1))&&(API.Auth.validate('view','details',1,'issues'))){
															item.find('i').first().addClass('pointer');
															item.find('i').first().off().click(function(){
																API.CRUD.read.show({ key:'id',keys:data.details.issues.dom[item.attr('data-id')], href:"?p=issues&v=details&id="+data.details.issues.dom[item.attr('data-id')].id, modal:true });
															});
														}
													});
													break;
												case"notes":
													API.Builder.Timeline.add.card(layout.timeline,details,'sticky-note','warning',function(item){
														item.find('.timeline-footer').remove();
														if(API.Auth.validate('custom', 'calls_notes', 4)){
															$('<a class="time bg-warning pointer"><i class="fas fa-trash-alt"></i></a>').insertAfter(item.find('span.time.bg-warning'));
															item.find('a.pointer').off().click(function(){
																API.CRUD.delete.show({ keys:data.relations.notes[item.attr('data-id')],key:'id', modal:true, plugin:'notes' },function(note){
																	item.remove();
																});
															});
														}
													});
													break;
												case"contacts":
													API.Builder.Timeline.add.contact(layout.timeline,details,'address-card','secondary',function(item){});
													break;
												case"users":
													API.Builder.Timeline.add.subscription(layout.timeline,details,'bell','lightblue',function(item){
														if((API.Auth.validate('plugin','users',1))&&(API.Auth.validate('view','details',1,'users'))){
															item.find('i').first().addClass('pointer');
															item.find('i').first().off().click(function(){
																API.CRUD.read.show({ key:'username',keys:data.details.users.dom[item.attr('data-id')], href:"?p=users&v=details&id="+data.details.users.dom[item.attr('data-id')].username, modal:true });
															});
														}
													});
													break;
											}
										}
									}
								}
							}
							layout.timeline.find('.time-label').first().find('div.btn-group button').off().click(function(){
								var filters = layout.timeline.find('.time-label').first().find('div.btn-group');
								var all = filters.find('button').first();
								if($(this).attr('data-table') != 'all'){
									if(all.hasClass("btn-primary")){ all.removeClass('btn-primary').addClass('btn-secondary'); }
									if($(this).hasClass("btn-secondary")){ $(this).removeClass('btn-secondary').addClass('btn-primary'); }
									else { $(this).removeClass('btn-primary').addClass('btn-secondary'); }
									layout.timeline.find('[data-type]').hide();
									layout.timeline.find('.time-label').first().find('div.btn-group button.btn-primary').each(function(){
										switch($(this).attr('data-table')){
											case"notes":var icon = 'sticky-note';break;
											case"comments":var icon = 'comment';break;
											case"statuses":var icon = 'info';break;
											case"users":var icon = 'bell';break;
											case"organizations":var icon = 'building';break;
											case"employees":var icon = 'id-card';break;
											case"contacts":var icon = 'address-card';break;
											case"calls":var icon = 'phone-square';break;
											case"services":var icon = 'hand-holding-usd';break;
											case"issues":var icon = 'gavel';break;
										}
										if((icon != '')&&(typeof icon !== 'undefined')){ layout.timeline.find('[data-type="'+icon+'"]').show(); }
									});
								} else {
									filters.find('button').removeClass('btn-primary').addClass('btn-secondary');
									all.removeClass('btn-secondary').addClass('btn-primary');
									layout.timeline.find('[data-type]').show();
								}
							});
						});
					});
				}
			});
		},
	},
	GUI:{
		button:function(dataset,options = {}){
			var defaults = {
				icon:"fas fa-building",
				action:"details",
				color:"primary",
				key:"name",
				id:"id",
				content:"",
			};
			if(API.Helper.isSet(options,['icon'])){ defaults.icon = options.icon; }
			if(API.Helper.isSet(options,['action'])){ defaults.action = options.action; }
			if(API.Helper.isSet(options,['color'])){ defaults.color = options.color; }
			if(API.Helper.isSet(options,['key'])){ defaults.key = options.key; }
			if(API.Helper.isSet(options,['id'])){ defaults.id = options.id; }
			if(API.Helper.isSet(options,['content'])){ defaults.content = options.content; }
			else { defaults.content = dataset[defaults.key]; }
			if(defaults.content != ''){ defaults.icon += ' mr-1'; }
			return '<button type="button" class="btn btn-sm bg-'+defaults.color+'" data-id="'+dataset[defaults.id]+'" data-action="'+defaults.action+'"><i class="'+defaults.icon+'"></i>'+defaults.content+'</button>';
		},
		buttons:{
			details:function(dataset,options = {}){
				var defaults = {
					icon:{details:"fas fa-building",remove:"fas fa-unlink"},
					action:{details:"details",remove:"unlink"},
					color:{details:"primary",remove:"danger"},
					key:"name",
					id:"id",
					content:"",
					remove:false,
				};
				if(API.Helper.isSet(options,['icon','details'])){ defaults.icon.details = options.icon.details; }
				if(API.Helper.isSet(options,['icon','remove'])){ defaults.icon.remove = options.icon.remove; }
				if(API.Helper.isSet(options,['color','details'])){ defaults.color.details = options.color.details; }
				if(API.Helper.isSet(options,['color','remove'])){ defaults.color.remove = options.color.remove; }
				if(API.Helper.isSet(options,['action','details'])){ defaults.action.details = options.action.details; }
				if(API.Helper.isSet(options,['action','remove'])){ defaults.action.remove = options.action.remove; }
				if(API.Helper.isSet(options,['key'])){ defaults.key = options.key; }
				if(API.Helper.isSet(options,['id'])){ defaults.id = options.id; }
				if(API.Helper.isSet(options,['remove'])){ defaults.remove = options.remove; }
				if(API.Helper.isSet(options,['content'])){ defaults.content = options.content; }
				else { defaults.content = dataset[defaults.key]; }
				var html = '';
				html += '<div class="btn-group m-1" data-id="'+dataset[defaults.id]+'">';
					html += '<button type="button" class="btn btn-xs bg-'+defaults.color.details+'" data-id="'+dataset[defaults.id]+'" data-action="'+defaults.action.details+'"><i class="'+defaults.icon.details+' mr-1"></i>'+defaults.content+'</button>';
					if(defaults.remove){
						html += '<button type="button" class="btn btn-xs bg-'+defaults.color.remove+'" data-id="'+dataset[[defaults.id]]+'" data-action="'+defaults.action.remove+'"><i class="'+defaults.icon.remove+'"></i></button>';
					}
				html += '</div>';
				return html;
			},
		},
		toast:{
			init:function(){
				$('body').prepend('<div class="toasts-bottom-right fixed py-3" style="width:400px;"></div>');
				API.Plugins.calls.GUI.toast.element = $('body').find('div').first();
			},
			create:function(title,body,options = {},callback = null){
				if(options instanceof Function){ callback = options; options = {}; }
				var html = '';
				html += '<div class="toast bg-dark fade show" style="max-width:100%;">';
			    html += '<div class="toast-header py-4" style="display:block">'+title+'</div>';
			    html += '<div class="toast-body">'+body+'</div>';
			  html += '</div>';
				API.Plugins.calls.GUI.toast.element.prepend(html);
				var toast = API.Plugins.calls.GUI.toast.element.find('div.toast').first();
				toast.show();
				if(callback != null){ callback(toast); }
			}
		},
		widget:function(dataset,call,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			if(API.Helper.isSet(API.Plugins,['calls','GUI','toast','element']) && API.Plugins.calls.GUI.toast.element.find('div.toast[data-id="'+call.id+'"]').length <= 0){
				var title = '', body = '';
				if(API.Helper.isSet(dataset,['relations','contacts',call.contact])){
					var contact = dataset.relations.contacts[call.contact];
					title += '<div class="row">';
		        title += '<div class="col-3 text-center align-middle">';
		          title += '<img class="img-circle" style="height:65px;width:65px;" src="./dist/img/default.png">';
		        title += '</div>';
						title += '<div class="col-9">';
			        title += '<h4 class="font-weight-light">'+contact.name+'</h4>';
			        title += '<h5 class="font-weight-light">'+contact.job_title+'</h5>';
			      title += '</div>';
					title += '</div>';
				} else {
					title += '<div class="row">';
		        title += '<div class="col-3 text-center align-middle">';
		          title += '<img class="img-circle bg-white" style="height:65px;width:65px;" src="./dist/img/building.png">';
		        title += '</div>';
						title += '<div class="col-9">';
			        title += '<h4 class="font-weight-light">'+dataset.this.dom.name+'</h4>';
			      title += '</div>';
					title += '</div>';
				}
				body += '<div class="row">';
					body += '<div class="col-8">';
						body += '<a class="btn btn-sm btn-block btn-success"><i class="fas fa-phone-alt mr-2"></i>'+call.phone+'</a>';
					body += '</div>';
					body += '<div class="col-4">';
						body += '<button type="button" class="btn btn-sm btn-block btn-danger"><i class="fas fa-phone-slash mr-2"></i>End</button>';
					body += '</div>';
				body += '</div>';
				API.Plugins.calls.GUI.toast.create(title,body,function(toast){
					toast.attr('data-id',call.id);
					if(API.debug){
						toast.find('img').off().click(function(){
							console.log(dataset);
							console.log(toast);
						});
					}
					toast.find('a').off().click(function(){
						API.CRUD.read.show({ key:'name',keys:dataset.this.dom, href:"?p=calls&v=details&id="+dataset.this.dom.name, modal:true });
					});
					toast.find('button').off().click(function(){
						API.Plugins.calls.Events.end(dataset,call);
					});
					if(callback != null){ callback(toast); }
				});
			}
		},
	},
	Events:{
		notes:function(dataset,layout,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			var defaults = {field: "name"};
			if(API.Helper.isSet(options,['field'])){ defaults.field = options.field; }
			if(API.Auth.validate('custom', 'calls_notes', 2)){
				layout.content.notes.find('button').off().click(function(){
					if(!layout.content.notes.find('textarea').summernote('isEmpty')){
						var note = {
							by:API.Contents.Auth.User.id,
							content:layout.content.notes.find('textarea').summernote('code'),
							relationship:'calls',
							link_to:dataset.this.dom.id,
						};
						layout.content.notes.find('textarea').val('');
						layout.content.notes.find('textarea').summernote('code','');
						layout.content.notes.find('textarea').summernote('destroy');
						layout.content.notes.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						API.request('calls','note',{data:note},function(result){
							var data = JSON.parse(result);
							if(data.success != undefined){
								API.Builder.Timeline.add.card(layout.timeline,data.output.note.dom,'sticky-note','warning',function(item){
									item.find('.timeline-footer').remove();
									if(API.Auth.validate('custom', 'calls_notes', 4)){
										$('<a class="time bg-warning pointer"><i class="fas fa-trash-alt"></i></a>').insertAfter(item.find('span.time.bg-warning'));
										item.find('a.pointer').off().click(function(){
											API.CRUD.delete.show({ keys:data.output.note.dom,key:'id', modal:true, plugin:'notes' },function(note){
												item.remove();
											});
										});
									}
								});
							}
						});
						layout.tabs.find('a').first().tab('show');
					} else {
						layout.content.notes.find('textarea').summernote('destroy');
						layout.content.notes.find('textarea').summernote({
							toolbar: [
								['font', ['fontname', 'fontsize']],
								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
								['color', ['color']],
								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
							],
							height: 250,
						});
						alert(API.Contents.Language['Note is empty']);
					}
				});
			}
		},
		services:function(dataset,layout,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			var defaults = {field: "name"};
			if(API.Helper.isSet(options,['field'])){ defaults.field = options.field; }
			var td = layout.details.find('td[data-plugin="calls"][data-key="services"]');
			td.find('button').off().click(function(){
				var button = $(this);
				if(button.attr('data-action') != "link"){ var service = {raw:dataset.details.services.raw[button.attr('data-id')],dom:dataset.details.services.dom[button.attr('data-id')]}; }
				switch(button.attr('data-action')){
					case"details":
						API.CRUD.read.show({ key:'name',keys:service.dom, href:"?p=services&v=details&id="+service.raw.name, modal:true });
						break;
					case"unlink":
						API.request('calls','unlink',{data:{id:dataset.this.raw.id,relationship:{relationship:'services',link_to:service.raw.id}}},function(result){
							var sub_dataset = JSON.parse(result);
							if(sub_dataset.success != undefined){
								layout.timeline.find('[data-type="hand-holding-usd"][data-id="'+sub_dataset.output.id+'"]').remove();
								td.find('.btn-group[data-id="'+sub_dataset.output.id+'"]').remove();
							}
						});
						break;
					case"link":
						API.Builder.modal($('body'), {
							title:'Link a service',
							icon:'services',
							zindex:'top',
							css:{ header: "bg-gray", body: "p-3"},
						}, function(modal){
							modal.on('hide.bs.modal',function(){ modal.remove(); });
							var dialog = modal.find('.modal-dialog');
							var header = modal.find('.modal-header');
							var body = modal.find('.modal-body');
							var footer = modal.find('.modal-footer');
							header.find('button[data-control="hide"]').remove();
							header.find('button[data-control="update"]').remove();
							API.Builder.input(body, 'service', null,{plugin:'services'}, function(input){});
							footer.append('<button class="btn btn-secondary" data-action="link"><i class="fas fa-link mr-1"></i>'+API.Contents.Language['Link']+'</button>');
							footer.find('button[data-action="link"]').click(function(){
								if((typeof body.find('select').select2('val') !== "undefined")&&(body.find('select').select2('val') != '')){
									API.request('calls','link',{data:{id:dataset.this.dom.id,relationship:{relationship:'services',link_to:body.find('select').select2('val')}}},function(result){
										var sub_dataset = JSON.parse(result);
										if(sub_dataset.success != undefined){
											API.Helper.set(API.Contents,['data','dom','services',sub_dataset.output.dom.id],sub_dataset.output.dom);
											API.Helper.set(API.Contents,['data','raw','services',sub_dataset.output.raw.id],sub_dataset.output.raw);
											API.Helper.set(dataset.details,['services','dom',sub_dataset.output.dom.id],sub_dataset.output.dom);
											API.Helper.set(dataset.details,['services','raw',sub_dataset.output.raw.id],sub_dataset.output.raw);
											API.Helper.set(dataset,['relations','services',sub_dataset.output.dom.id],sub_dataset.output.dom);
											var html = API.Plugins.calls.GUI.buttons.details(sub_dataset.output.dom,{remove:API.Auth.validate('custom', 'calls_services', 4),icon:{details:"fas fa-hand-holding-usd"}});
											if(td.find('button[data-action="link"]').length > 0){
												td.find('button[data-action="link"]').before(html);
											} else { td.append(html); }
											sub_dataset.output.dom.owner = sub_dataset.output.timeline.owner;
											sub_dataset.output.dom.created = sub_dataset.output.timeline.created;
											API.Builder.Timeline.add.service(layout.timeline,sub_dataset.output.dom,'hand-holding-usd','success',function(item){
												if((API.Auth.validate('plugin','services',1))&&(API.Auth.validate('view','details',1,'services'))){
													item.find('i').first().addClass('pointer');
													item.find('i').first().off().click(function(){
														API.CRUD.read.show({ key:'name',keys:sub_dataset.output.dom, href:"?p=services&v=details&id="+sub_dataset.output.dom.name, modal:true });
													});
												}
											});
											API.Plugins.calls.Events.services(dataset,layout);
										}
									});
									modal.modal('hide');
								} else {
									body.find('.input-group').addClass('is-invalid');
									alert('No organization were selected!');
								}
							});
							modal.modal('show');
						});
						break;
				}
			});
			if(callback != null){ callback(dataset,layout); }
		},
		issues:function(dataset,layout,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			var defaults = {field: "name"};
			if(API.Helper.isSet(options,['field'])){ defaults.field = options.field; }
			var td = layout.details.find('td[data-plugin="calls"][data-key="issues"]');
			var issues = {};
			for(var [rid, relations] of Object.entries(dataset.relationships)){
				for(var [uid, relation] of Object.entries(relations)){
					if(relation.relationship == 'issues'){ issues[relation.link_to] = relation.statuses; }
				}
			}
			td.find('button').off().click(function(){
				var button = $(this);
				if(button.attr('data-action') != "link"){ var issue = {raw:dataset.details.issues.raw[button.attr('data-id')],dom:dataset.details.issues.dom[button.attr('data-id')]}; }
				switch(button.attr('data-action')){
					case"details":
						API.CRUD.read.show({ key:'name',keys:issue.dom, href:"?p=issues&v=details&id="+issue.raw.id, modal:true });
						break;
					case"unlink":
						API.request('calls','unlink',{data:{id:dataset.this.raw.id,relationship:{relationship:'issues',link_to:issue.raw.id}}},function(result){
							var sub_dataset = JSON.parse(result);
							if(sub_dataset.success != undefined){
								layout.timeline.find('[data-type="gavel"][data-id="'+sub_dataset.output.id+'"]').remove();
								td.find('.btn-group[data-id="'+sub_dataset.output.id+'"]').remove();
							}
						});
						break;
					case"link":
						API.Builder.modal($('body'), {
							title:'Link an issue',
							icon:'issues',
							zindex:'top',
							css:{ header: "bg-gray", body: "p-3"},
						}, function(modal){
							modal.on('hide.bs.modal',function(){ modal.remove(); });
							var dialog = modal.find('.modal-dialog');
							var header = modal.find('.modal-header');
							var body = modal.find('.modal-body');
							var footer = modal.find('.modal-footer');
							header.find('button[data-control="hide"]').remove();
							header.find('button[data-control="update"]').remove();
							API.Builder.input(body, 'issue', null,{plugin:'issues'}, function(input){});
							footer.append('<button class="btn btn-secondary" data-action="link"><i class="fas fa-link mr-1"></i>'+API.Contents.Language['Link']+'</button>');
							footer.find('button[data-action="link"]').click(function(){
								if((typeof body.find('select').select2('val') !== "undefined")&&(body.find('select').select2('val') != '')){
									API.request('calls','link',{data:{id:dataset.this.dom.id,relationship:{relationship:'issues',link_to:body.find('select').select2('val')}}},function(result){
										var sub_dataset = JSON.parse(result);
										if(sub_dataset.success != undefined){
											API.Helper.set(API.Contents,['data','dom','issues',sub_dataset.output.dom.id],sub_dataset.output.dom);
											API.Helper.set(API.Contents,['data','raw','issues',sub_dataset.output.raw.id],sub_dataset.output.raw);
											API.Helper.set(dataset.details,['issues','dom',sub_dataset.output.dom.id],sub_dataset.output.dom);
											API.Helper.set(dataset.details,['issues','raw',sub_dataset.output.raw.id],sub_dataset.output.raw);
											sub_dataset.output.dom.status = 1;
											API.Helper.set(dataset,['relations','issues',sub_dataset.output.dom.id],sub_dataset.output.dom);
											var html = API.Plugins.calls.GUI.buttons.details(sub_dataset.output.dom,{
												remove:API.Auth.validate('custom', 'calls_issues', 4),
												content:sub_dataset.output.dom.id+' - '+sub_dataset.output.dom.name+' - '+API.Contents.Statuses.issues['1'].name,
												color:{
													details:API.Contents.Statuses.issues['1'].color
												},
												icon:{
													details:API.Contents.Statuses.issues['1'].icon
												},
											});
											if(td.find('button[data-action="link"]').length > 0){
												td.find('button[data-action="link"]').before(html);
											} else { td.append(html); }
											sub_dataset.output.dom.owner = sub_dataset.output.timeline.owner;
											sub_dataset.output.dom.created = sub_dataset.output.timeline.created;
											sub_dataset.output.dom.statuses = sub_dataset.output.timeline.statuses;
											sub_dataset.output.dom.status = 1;
											API.Builder.Timeline.add.issue(layout.timeline,sub_dataset.output.dom,'gavel','indigo',function(item){
												if((API.Auth.validate('plugin','issues',1))&&(API.Auth.validate('view','details',1,'issues'))){
													item.find('i').first().addClass('pointer');
													item.find('i').first().off().click(function(){
														API.CRUD.read.show({ key:'name',keys:sub_dataset.output.dom, href:"?p=issues&v=details&id="+sub_dataset.output.dom.id, modal:true });
													});
												}
											});
											API.Plugins.calls.Events.issues(dataset,layout);
										}
									});
									modal.modal('hide');
								} else {
									body.find('.input-group').addClass('is-invalid');
									alert('No organization were selected!');
								}
							});
							modal.modal('show');
						});
						break;
				}
			});
			if(callback != null){ callback(dataset,layout); }
		},
		users:function(dataset,layout,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			var defaults = {field: "name"};
			if(API.Helper.isSet(options,['field'])){ defaults.field = options.field; }
			var td = layout.details.find('td[data-plugin="calls"][data-key="assigned_to"]');
			td.find('button').off().click(function(){
				var button = $(this);
				if(button.attr('data-action') != "assign"){
					if(API.Helper.isSet(API.Contents,['data','raw','users',button.attr('data-id')])){
						var user = {raw:API.Contents.data.raw.users[button.attr('data-id')],dom:{}};
						user.dom = API.Contents.data.dom.users[user.raw.username];
					} else {
						var user = {
							dom:dataset.details.users.dom[button.attr('data-id')],
							raw:dataset.details.users.raw[button.attr('data-id')],
						};
					}
				}
				switch(button.attr('data-action')){
					case"details":
						API.CRUD.read.show({ key:'username',keys:user.dom, href:"?p=users&v=details&id="+user.raw.username, modal:true });
						break;
					case"unassign":
						API.request('calls','unassign',{data:{id:dataset.this.raw.id,user:button.attr('data-id')}},function(result){
							var sub_dataset = JSON.parse(result);
							if(sub_dataset.success != undefined){
								td.find('.btn-group[data-id="'+sub_dataset.output.user+'"]').remove();
							}
						});
						break;
					case"assign":
						API.Builder.modal($('body'), {
							title:'Assign a user',
							icon:'user',
							zindex:'top',
							css:{ header: "bg-gray", body: "p-3"},
						}, function(modal){
							modal.on('hide.bs.modal',function(){ modal.remove(); });
							var dialog = modal.find('.modal-dialog');
							var header = modal.find('.modal-header');
							var body = modal.find('.modal-body');
							var footer = modal.find('.modal-footer');
							header.find('button[data-control="hide"]').remove();
							header.find('button[data-control="update"]').remove();
							API.Builder.input(body, 'user', null, function(input){});
							footer.append('<button class="btn btn-secondary" data-action="assign"><i class="fas fa-user-plus mr-1"></i>'+API.Contents.Language['Assign']+'</button>');
							footer.find('button[data-action="assign"]').click(function(){
								if((typeof body.find('select').select2('val') !== "undefined")&&(body.find('select').select2('val') != '')){
									API.request('calls','assign',{data:{id:dataset.this.dom.id,user:body.find('select').select2('val')}},function(result){
										var sub_dataset = JSON.parse(result);
										if(sub_dataset.success != undefined){
											for(var [key, user] of Object.entries(sub_dataset.output.organization.raw.assigned_to.split(';'))){
												if(user != '' && td.find('div.btn-group[data-id="'+user+'"]').length <= 0){
													user = {
														dom:sub_dataset.output.users.dom[user],
														raw:sub_dataset.output.users.raw[user],
													};
													API.Helper.set(API.Contents,['data','dom','users',user.dom.username],user.dom);
													API.Helper.set(API.Contents,['data','raw','users',user.raw.id],user.raw);
													API.Helper.set(dataset.details,['users','dom',user.dom.id],user.dom);
													API.Helper.set(dataset.details,['users','dom',user.raw.id],user.raw);
													var html = API.Plugins.calls.GUI.buttons.details(user.dom,{
														remove:API.Auth.validate('custom', 'calls_users', 4),
														key: "username",
														icon:{
															details:"fas fa-user",
															remove:"fas fa-user-minus",
														},
														action:{
															remove:"unassign",
														},
													});
													if(td.find('button[data-action="assign"]').length > 0){
														td.find('button[data-action="assign"]').before(html);
													} else { td.append(html); }
												}
											}
											API.Plugins.calls.Events.users(dataset,layout);
										}
									});
									modal.modal('hide');
								} else {
									body.find('.input-group').addClass('is-invalid');
									alert('No organization were selected!');
								}
							});
							modal.modal('show');
						});
						break;
				}
			});
			if(callback != null){ callback(dataset,layout); }
		},
		create:function(dataset,call,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			for(var [id, layout] of Object.entries(API.Contents.layouts.organizations[dataset.this.raw.id])){
				layout.content.calls.find('tr[data-id="'+call.id+'"]').remove();
				layout.content.callbacks.find('tr[data-id="'+call.id+'"]').remove();
				API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[call.id]);
				API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[call.id],'phone-square','olive',function(item){
					item.find('i').first().addClass('pointer');
					item.find('i').first().off().click(function(){
						API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
					});
				});
			}
			API.Plugins.calls.GUI.widget(dataset,call,function(toast){
				if(callback != null){ callback(dataset,call,toast); }
			});
		},
		start:function(dataset,call,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			call.status = 3;
			API.request('calls','start',{data:call},function(result){
				var record = JSON.parse(result);
				if(typeof record.success !== 'undefined'){
					// Update Browser DB
					API.Helper.set(dataset,['details','calls','dom',record.output.dom.id],record.output.dom);
					API.Helper.set(dataset,['details','calls','raw',record.output.raw.id],record.output.raw);
					API.Helper.set(dataset,['relations','calls',record.output.dom.id],record.output.dom);
					for(var [id, layout] of Object.entries(API.Contents.layouts.organizations[record.output.raw.organization])){
						layout.content.calls.find('tr[data-id="'+record.output.dom.id+'"]').remove();
						layout.content.callbacks.find('tr[data-id="'+record.output.dom.id+'"]').remove();
						API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[record.output.raw.id]);
						dataset.relations.calls[record.output.raw.id].created = API.Helper.toString(new Date());
						API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[record.output.raw.id],'phone-square','olive',function(item){
							item.find('i').first().addClass('pointer');
							item.find('i').first().off().click(function(){
								API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
							});
						});
					}
					// Update Call Window
					API.Plugins.calls.GUI.widget(dataset,record.output.raw,function(toast){
						if(callback != null){ callback(dataset,call,toast); }
					});
				}
			});
		},
		cancel:function(dataset,call,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
			call.status = 6;
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
				footer.find('button[data-action="cancel"]').off().click(function(){
					if(!body.find('textarea').summernote('isEmpty')){
						call.note = body.find('textarea').summernote('code');
						API.request('calls','cancel',{data:call},function(result){
							var record = JSON.parse(result);
							if(typeof record.success !== 'undefined'){
								// Update Browser DB
								API.Helper.set(dataset,['details','calls','dom',record.output.dom.id],record.output.dom);
								API.Helper.set(dataset,['details','calls','raw',record.output.raw.id],record.output.raw);
								API.Helper.set(dataset,['relations','calls',record.output.dom.id],record.output.dom);
								if(API.Helper.isSet(record,['output','note','dom'])){
									API.Helper.set(dataset,['details','notes','dom',record.output.note.dom.id],record.output.note.dom);
									API.Helper.set(dataset,['details','notes','raw',record.output.note.raw.id],record.output.note.raw);
									API.Helper.set(dataset,['relations','notes',record.output.note.dom.id],record.output.note.dom);
								}
								for(var [id, layout] of Object.entries(API.Contents.layouts.organizations[record.output.raw.organization])){
									layout.content.calls.find('tr[data-id="'+record.output.dom.id+'"]').remove();
									layout.content.callbacks.find('tr[data-id="'+record.output.dom.id+'"]').remove();
									API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[record.output.raw.id]);
									dataset.relations.calls[record.output.raw.id].created = API.Helper.toString(new Date());
									API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[record.output.raw.id],'phone-square','olive',function(item){
										item.find('i').first().addClass('pointer');
										item.find('i').first().off().click(function(){
											API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
										});
									});
									if(API.Auth.validate('custom', 'calls_notes', 1)){
										if(API.Helper.isSet(record,['output','note','dom'])){
							        API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
							          item.find('.timeline-footer').remove();
							          if(API.Auth.validate('custom', 'calls_notes', 4)){
							            $('<a class="time bg-warning pointer"><i class="fas fa-trash-alt"></i></a>').insertAfter(item.find('span.time.bg-warning'));
													item.find('a.pointer').off().click(function(){
														API.CRUD.delete.show({ keys:record.output.note.dom,key:'id', modal:true, plugin:'notes' },function(note){
															item.remove();
														});
													});
							          }
							        });
										}
									}
								}
								// Update Call Window
								if(callback != null){ callback(dataset,record.output.raw); }
							}
						});
						modal.modal('hide');
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
		reschedule:function(dataset,call,options = {},callback = null){
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
				footer.find('button[data-action="reschedule"]').off().click(function(){
					if(!body.find('textarea').summernote('isEmpty')){ call.note = body.find('textarea').summernote('code'); }
					call.newdate = body.find('input[data-key="date"]').val();
					call.newtime = body.find('input[data-key="time"]').val();
					if((call.newdate != '')&&(call.newtime != '')){
						API.request('calls','reschedule',{ data:call },function(result){
							var record = JSON.parse(result);
							if(record.success != undefined){
								// Update Browser DB
								API.Helper.set(dataset,['details','calls','dom',record.output.dom.id],record.output.dom);
								API.Helper.set(dataset,['details','calls','raw',record.output.raw.id],record.output.raw);
								API.Helper.set(dataset,['relations','calls',record.output.dom.id],record.output.dom);
								if(API.Helper.isSet(record,['output','note','dom'])){
									API.Helper.set(dataset,['details','notes','dom',record.output.note.dom.id],record.output.note.dom);
									API.Helper.set(dataset,['details','notes','raw',record.output.note.raw.id],record.output.note.raw);
									API.Helper.set(dataset,['relations','notes',record.output.note.dom.id],record.output.note.dom);
								}
								if(API.Helper.isSet(record.output,['new'])){
									API.Helper.set(dataset,['details','calls','dom',record.output.new.output.dom.id],record.output.new.output.dom);
									API.Helper.set(dataset,['details','calls','raw',record.output.new.output.raw.id],record.output.new.output.raw);
									API.Helper.set(dataset,['relations','calls',record.output.new.output.dom.id],record.output.new.output.dom);
								}
								// Update Organization
								for(var [id, layout] of Object.entries(API.Contents.layouts.organizations[dataset.this.raw.id])){
									layout.content.calls.find('tr[data-id="'+call.id+'"]').remove();
									layout.content.callbacks.find('tr[data-id="'+call.id+'"]').remove();
									API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[call.id]);
									dataset.relations.calls[record.output.raw.id].created = API.Helper.toString(new Date());
									API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[call.id],'phone-square','olive',function(item){
										item.find('i').first().addClass('pointer');
										item.find('i').first().off().click(function(){
											API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
										});
									});
									if(API.Auth.validate('custom', 'calls_notes', 1)){
										if(API.Helper.isSet(record,['output','note','dom'])){
							        API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
							          item.find('.timeline-footer').remove();
							          if(API.Auth.validate('custom', 'calls_notes', 4)){
							            $('<a class="time bg-warning pointer"><i class="fas fa-trash-alt"></i></a>').insertAfter(item.find('span.time.bg-warning'));
													item.find('a.pointer').off().click(function(){
														API.CRUD.delete.show({ keys:record.output.note.dom,key:'id', modal:true, plugin:'notes' },function(note){
															item.remove();
														});
													});
							          }
							        });
										}
									}
									if(API.Helper.isSet(record.output,['new'])){
										API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[record.output.new.output.dom.id],function(){
											API.Plugins.organizations.Events.callbacks(dataset,layout);
										});
										API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[record.output.new.output.dom.id],'phone-square','olive',function(item){
											item.find('i').first().addClass('pointer');
											item.find('i').first().off().click(function(){
												API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
											});
										});
									}
								}
								// Update Call Window
								if(callback != null){ callback(dataset,record.output.raw); }
							}
						});
						modal.modal('hide');
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
		end:function(dataset,call,options = {},callback = null){
			if(options instanceof Function){ callback = options; options = {}; }
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
				if(API.Helper.isSet(dataset,['relations','issues'])){
					for(var [id, issue] of Object.entries(dataset.relations.issues)){
						if(issue.status <= 3){
							API.Helper.set(call,['issues',issue.id],issue.status);
							count++;
							if(count > 2){ top = 'pb'; }
							if(side == 'pl'){ side = 'pr'; } else { side = 'pl'; }
							var html = '';
							html += '<div class="col-md-6 '+top+'-3 '+side+'-4" data-issue="'+issue.id+'">';
								html += '<div class="input-group">';
									html += '<div class="input-group-prepend">';
										html += '<span class="input-group-text"><i class="fas fa-gavel mr-1"></i>'+issue.id+' - '+issue.name+'</span>';
									html += '</div>';
									html += '<select title="'+issue.id+' - '+issue.name+'" class="form-control select2bs4 select2-hidden-accessible" name="'+issue.id+'">';
									for(var [statusOrder, status] of Object.entries(API.Contents.Statuses.issues)){
										if(issue.status == statusOrder){
											html += '<option value="'+statusOrder+'" selected="selected">'+API.Contents.Language[status.name]+'</option>';
										} else {
											html += '<option value="'+statusOrder+'">'+API.Contents.Language[status.name]+'</option>';
										}
									}
									html += '</select>';
								html += '</div>';
							html += '</div>';
							body.find('div.row').append(html);
						}
					}
				}
				body.find('select').select2({ theme: 'bootstrap4' });
				footer.append('<div class="btn-group"></div>');
				footer.find('div.btn-group').append('<button class="btn btn-primary" data-action="reschedule"><i class="fas fa-calendar-day mr-1"></i>Re-Schedule</button>');
				footer.find('div.btn-group').append('<button class="btn btn-danger" data-action="end"><i class="fas fa-phone-slash mr-1"></i>End</button>');
				footer.find('button[data-action="reschedule"]').off().click(function(){
					if(!body.find('textarea').summernote('isEmpty')){
						call.status = 4;
						call.note = body.find('textarea').summernote('code');
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
						if(API.Helper.isSet(dataset,['relations','issues'])){
							for(var [id, issue] of Object.entries(dataset.relations.issues)){
								if(issue.status <= 3){
									API.Helper.set(call,['issues',issue.id],body.find('div[data-issue="'+issue.id+'"]').find('select').select2('val'));
								}
							}
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
							footer.find('button[data-action="reschedule"]').off().click(function(){
								call.date = body.find('input[data-key="date"]').val();
								call.time = body.find('input[data-key="time"]').val();
								if((call.date != '')&&(call.time != '')){
									API.request('calls','end',{ data:call },function(result){
										var record = JSON.parse(result);
										if(record.success != undefined){
											// Update Browser DB
											API.Helper.set(dataset,['details','calls','dom',record.output.dom.id],record.output.dom);
											API.Helper.set(dataset,['details','calls','raw',record.output.raw.id],record.output.raw);
											API.Helper.set(dataset,['relations','calls',record.output.dom.id],record.output.dom);
											if(API.Helper.isSet(record,['output','note','dom'])){
												API.Helper.set(dataset,['details','notes','dom',record.output.note.dom.id],record.output.note.dom);
												API.Helper.set(dataset,['details','notes','raw',record.output.note.raw.id],record.output.note.raw);
												API.Helper.set(dataset,['relations','notes',record.output.note.dom.id],record.output.note.dom);
											}
											if(API.Helper.isSet(record.output,['new'])){
												API.Helper.set(dataset,['details','calls','dom',record.output.new.output.dom.id],record.output.new.output.dom);
												API.Helper.set(dataset,['details','calls','raw',record.output.new.output.raw.id],record.output.new.output.raw);
												API.Helper.set(dataset,['relations','calls',record.output.new.output.dom.id],record.output.new.output.dom);
											}
											// Update Organization
											for(var [id, layout] of Object.entries(API.Contents.layouts.organizations[dataset.this.raw.id])){
												layout.content.calls.find('tr[data-id="'+call.id+'"]').remove();
												layout.content.callbacks.find('tr[data-id="'+call.id+'"]').remove();
												API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[call.id]);
												dataset.relations.calls[record.output.raw.id].created = API.Helper.toString(new Date());
												API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[call.id],'phone-square','olive',function(item){
													item.find('i').first().addClass('pointer');
													item.find('i').first().off().click(function(){
														API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
													});
												});
												if(API.Auth.validate('custom', 'calls_notes', 1)){
													if(API.Helper.isSet(record,['output','note','dom'])){
										        API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
										          item.find('.timeline-footer').remove();
										          if(API.Auth.validate('custom', 'calls_notes', 4)){
										            $('<a class="time bg-warning pointer"><i class="fas fa-trash-alt"></i></a>').insertAfter(item.find('span.time.bg-warning'));
																item.find('a.pointer').off().click(function(){
																	API.CRUD.delete.show({ keys:record.output.note.dom,key:'id', modal:true, plugin:'notes' },function(note){
																		item.remove();
																	});
																});
										          }
										        });
													}
												}
												if(API.Helper.isSet(record.output,['new'])){
													API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[record.output.new.output.dom.id],function(){
														API.Plugins.organizations.Events.callbacks(dataset,layout);
													});
													API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[record.output.new.output.dom.id],'phone-square','olive',function(item){
														item.find('i').first().addClass('pointer');
														item.find('i').first().off().click(function(){
															API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
														});
													});
												}
												if(typeof call.issues !== 'undefined' && API.Helper.isSet(record,['output','issues'])){
													for(var [id, issue] of Object.entries(call.issues)){
														if(API.Helper.isSet(dataset,['relations','issues',id]) && API.Helper.isSet(record,['output','issues',id])){
															API.Helper.set(dataset,['details','issues','dom',id],record.output.issues[id]);
															API.Helper.set(dataset,['details','issues','raw',id],record.output.issues[id]);
															API.Helper.set(dataset,['relations','issues',id],record.output.issues[id]);
															dataset.relations.issues[id].created = API.Helper.toString(new Date());
															layout.details.find('td[data-plugin="calls"][data-key="issues"] div[data-id="'+id+'"]').remove();
															if(layout.details.find('td[data-plugin="calls"][data-key="issues"]').find('button[data-action="link"]').length <= 0){
																layout.details.find('td[data-plugin="calls"][data-key="issues"]').append(
																	API.Plugins.calls.GUI.buttons.details(dataset.relations.issues[id],{
																		remove:API.Auth.validate('custom', 'calls_issues', 4),
																		content:record.output.issues[id].id+' - '+record.output.issues[id].name+' - '+API.Contents.Language[API.Contents.Statuses.issues[record.output.issues[id].status].name],
																		color:{
																			details:API.Contents.Statuses.issues[record.output.issues[id].status].color
																		},
																		icon:{
																			details:API.Contents.Statuses.issues[record.output.issues[id].status].icon
																		},
																	})
																);
															} else {
																layout.details.find('td[data-plugin="calls"][data-key="issues"]').find('button[data-action="link"]').before(
																	API.Plugins.calls.GUI.buttons.details(dataset.relations.issues[id],{
																		remove:API.Auth.validate('custom', 'calls_issues', 4),
																		content:record.output.issues[id].id+' - '+record.output.issues[id].name+' - '+API.Contents.Language[API.Contents.Statuses.issues[record.output.issues[id].status].name],
																		color:{
																			details:API.Contents.Statuses.issues[record.output.issues[id].status].color
																		},
																		icon:{
																			details:API.Contents.Statuses.issues[record.output.issues[id].status].icon
																		},
																	})
																);
															}
															API.Builder.Timeline.add.issue(layout.timeline,dataset.relations.issues[id],'gavel','indigo',function(item){
																if((API.Auth.validate('plugin','issues',1))&&(API.Auth.validate('view','details',1,'issues'))){
																	item.find('i').first().addClass('pointer');
																	item.find('i').first().off().click(function(){
																		API.CRUD.read.show({ key:'id',keys:dataset.details.issues.dom[item.attr('data-id')], href:"?p=issues&v=details&id="+dataset.details.issues.dom[item.attr('data-id')].id, modal:true });
																	});
																}
															});
															API.Plugins.calls.Events.issues(dataset,layout);
														}
													}
												}
												if(API.Helper.isSet(record,['output','services'])){
													for(var [id, service] of Object.entries(record.output.services)){
														API.Helper.set(dataset,['details','services','dom',id],record.output.services[id]);
														API.Helper.set(dataset,['details','services','raw',id],record.output.services[id]);
														API.Helper.set(dataset,['relations','services',id],record.output.services[id]);
														dataset.relations.services[id].created = API.Helper.toString(new Date());
														layout.details.find('td[data-plugin="calls"][data-key="services"] div[data-id="'+id+'"]').remove();
														if(layout.details.find('td[data-plugin="calls"][data-key="services"]').find('button[data-action="link"]').length <= 0){
															layout.details.find('td[data-plugin="calls"][data-key="services"]').append(
																API.Plugins.calls.GUI.buttons.details(dataset.relations.services[id],{
																	remove:API.Auth.validate('custom', 'calls_services', 4),
																	icon:{details:"fas fa-hand-holding-usd"}
																})
															);
														} else {
															layout.details.find('td[data-plugin="calls"][data-key="services"]').find('button[data-action="link"]').before(
																API.Plugins.calls.GUI.buttons.details(dataset.relations.services[id],{
																	remove:API.Auth.validate('custom', 'calls_services', 4),
																	icon:{details:"fas fa-hand-holding-usd"}
																})
															);
														}
														API.Builder.Timeline.add.service(layout.timeline,dataset.relations.services[id],'hand-holding-usd','success',function(item){
															if((API.Auth.validate('plugin','services',1))&&(API.Auth.validate('view','details',1,'services'))){
																item.find('i').first().addClass('pointer');
																item.find('i').first().off().click(function(){
																	API.CRUD.read.show({ key:'name',keys:dataset.details.services.dom[item.attr('data-id')], href:"?p=services&v=details&id="+dataset.details.services.dom[item.attr('data-id')].name, modal:true });
																});
															}
														});
													}
													API.Plugins.calls.Events.services(dataset,layout);
												}
											}
											// Update Call Window
											// Update Widget Window
											if(API.Plugins.calls.GUI.toast.element.find('div[data-id="'+call.id+'"]').length > 0){
												API.Plugins.calls.GUI.toast.element.find('div[data-id="'+call.id+'"]').remove();
											}
											if(callback != null){ callback(dataset,record.output.raw); }
										}
									});
									modal.modal('hide');
									noteModal.modal('hide');
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
				footer.find('button[data-action="end"]').off().click(function(){
					if(!body.find('textarea').summernote('isEmpty')){
						call.status = 5;
						call.note = body.find('textarea').summernote('code');
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
						if(API.Helper.isSet(dataset,['relations','issues'])){
							for(var [id, issue] of Object.entries(dataset.relations.issues)){
								if(issue.status <= 3){
									API.Helper.set(call,['issues',issue.id],body.find('div[data-issue="'+issue.id+'"]').find('select').select2('val'));
								}
							}
						}
						API.request('calls','end',{ data:call },function(result){
							var record = JSON.parse(result);
							if(record.success != undefined){
								// Update Browser DB
								API.Helper.set(dataset,['details','calls','dom',record.output.dom.id],record.output.dom);
								API.Helper.set(dataset,['details','calls','raw',record.output.raw.id],record.output.raw);
								API.Helper.set(dataset,['relations','calls',record.output.dom.id],record.output.dom);
								if(API.Helper.isSet(record,['output','note','dom'])){
									API.Helper.set(dataset,['details','notes','dom',record.output.note.dom.id],record.output.note.dom);
									API.Helper.set(dataset,['details','notes','raw',record.output.note.raw.id],record.output.note.raw);
									API.Helper.set(dataset,['relations','notes',record.output.note.dom.id],record.output.note.dom);
								}
								if(API.Helper.isSet(record.output,['new'])){
									API.Helper.set(dataset,['details','calls','dom',record.output.new.output.dom.id],record.output.new.output.dom);
									API.Helper.set(dataset,['details','calls','raw',record.output.new.output.raw.id],record.output.new.output.raw);
									API.Helper.set(dataset,['relations','calls',record.output.new.output.dom.id],record.output.new.output.dom);
								}
								// Update Organization
								for(var [id, layout] of Object.entries(API.Contents.layouts.organizations[dataset.this.raw.id])){
									layout.content.calls.find('tr[data-id="'+call.id+'"]').remove();
									layout.content.callbacks.find('tr[data-id="'+call.id+'"]').remove();
									API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[call.id]);
									dataset.relations.calls[record.output.raw.id].created = API.Helper.toString(new Date());
									API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[call.id],'phone-square','olive',function(item){
										item.find('i').first().addClass('pointer');
										item.find('i').first().off().click(function(){
											API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
										});
									});
									if(API.Auth.validate('custom', 'calls_notes', 1)){
										if(API.Helper.isSet(record,['output','note','dom'])){
											API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
												item.find('.timeline-footer').remove();
												if(API.Auth.validate('custom', 'calls_notes', 4)){
													$('<a class="time bg-warning pointer"><i class="fas fa-trash-alt"></i></a>').insertAfter(item.find('span.time.bg-warning'));
													item.find('a.pointer').off().click(function(){
														API.CRUD.delete.show({ keys:record.output.note.dom,key:'id', modal:true, plugin:'notes' },function(note){
															item.remove();
														});
													});
												}
											});
										}
									}
									if(API.Helper.isSet(record.output,['new'])){
										API.Plugins.organizations.GUI.call(dataset,layout,dataset.relations.calls[record.output.new.output.dom.id],function(){
											API.Plugins.organizations.Events.callbacks(dataset,layout);
										});
										API.Builder.Timeline.add.call(layout.timeline,dataset.relations.calls[record.output.new.output.dom.id],'phone-square','olive',function(item){
											item.find('i').first().addClass('pointer');
											item.find('i').first().off().click(function(){
												API.CRUD.read.show({ key:{id:item.attr('data-id')}, title:item.attr('data-phone'), href:"?p=calls&v=details&id="+item.attr('data-id'), modal:true });
											});
										});
									}
									if(typeof call.issues !== 'undefined' && API.Helper.isSet(record,['output','issues'])){
										for(var [id, issue] of Object.entries(call.issues)){
											if(API.Helper.isSet(dataset,['relations','issues',id]) && API.Helper.isSet(record,['output','issues',id])){
												API.Helper.set(dataset,['details','issues','dom',id],record.output.issues[id]);
												API.Helper.set(dataset,['details','issues','raw',id],record.output.issues[id]);
												API.Helper.set(dataset,['relations','issues',id],record.output.issues[id]);
												dataset.relations.issues[id].created = API.Helper.toString(new Date());
												layout.details.find('td[data-plugin="calls"][data-key="issues"] div[data-id="'+id+'"]').remove();
												if(layout.details.find('td[data-plugin="calls"][data-key="issues"]').find('button[data-action="link"]').length <= 0){
													layout.details.find('td[data-plugin="calls"][data-key="issues"]').append(
														API.Plugins.calls.GUI.buttons.details(dataset.relations.issues[id],{
															remove:API.Auth.validate('custom', 'calls_issues', 4),
															content:record.output.issues[id].id+' - '+record.output.issues[id].name+' - '+API.Contents.Language[API.Contents.Statuses.issues[record.output.issues[id].status].name],
															color:{
																details:API.Contents.Statuses.issues[record.output.issues[id].status].color
															},
															icon:{
																details:API.Contents.Statuses.issues[record.output.issues[id].status].icon
															},
														})
													);
												} else {
													layout.details.find('td[data-plugin="calls"][data-key="issues"]').find('button[data-action="link"]').before(
														API.Plugins.calls.GUI.buttons.details(dataset.relations.issues[id],{
															remove:API.Auth.validate('custom', 'calls_issues', 4),
															content:record.output.issues[id].id+' - '+record.output.issues[id].name+' - '+API.Contents.Language[API.Contents.Statuses.issues[record.output.issues[id].status].name],
															color:{
																details:API.Contents.Statuses.issues[record.output.issues[id].status].color
															},
															icon:{
																details:API.Contents.Statuses.issues[record.output.issues[id].status].icon
															},
														})
													);
												}
												API.Builder.Timeline.add.issue(layout.timeline,dataset.relations.issues[id],'gavel','indigo',function(item){
													if((API.Auth.validate('plugin','issues',1))&&(API.Auth.validate('view','details',1,'issues'))){
														item.find('i').first().addClass('pointer');
														item.find('i').first().off().click(function(){
															API.CRUD.read.show({ key:'id',keys:dataset.details.issues.dom[item.attr('data-id')], href:"?p=issues&v=details&id="+dataset.details.issues.dom[item.attr('data-id')].id, modal:true });
														});
													}
												});
												API.Plugins.calls.Events.issues(dataset,layout);
											}
										}
									}
									if(API.Helper.isSet(record,['output','services'])){
										for(var [id, service] of Object.entries(record.output.services)){
											API.Helper.set(dataset,['details','services','dom',id],record.output.services[id]);
											API.Helper.set(dataset,['details','services','raw',id],record.output.services[id]);
											API.Helper.set(dataset,['relations','services',id],record.output.services[id]);
											dataset.relations.services[id].created = API.Helper.toString(new Date());
											layout.details.find('td[data-plugin="calls"][data-key="services"] div[data-id="'+id+'"]').remove();
											if(layout.details.find('td[data-plugin="calls"][data-key="services"]').find('button[data-action="link"]').length <= 0){
												layout.details.find('td[data-plugin="calls"][data-key="services"]').append(
													API.Plugins.calls.GUI.buttons.details(dataset.relations.services[id],{
														remove:API.Auth.validate('custom', 'calls_services', 4),
														icon:{details:"fas fa-hand-holding-usd"}
													})
												);
											} else {
												layout.details.find('td[data-plugin="calls"][data-key="services"]').find('button[data-action="link"]').before(
													API.Plugins.calls.GUI.buttons.details(dataset.relations.services[id],{
														remove:API.Auth.validate('custom', 'calls_services', 4),
														icon:{details:"fas fa-hand-holding-usd"}
													})
												);
											}
											API.Builder.Timeline.add.service(layout.timeline,dataset.relations.services[id],'hand-holding-usd','success',function(item){
												if((API.Auth.validate('plugin','services',1))&&(API.Auth.validate('view','details',1,'services'))){
													item.find('i').first().addClass('pointer');
													item.find('i').first().off().click(function(){
														API.CRUD.read.show({ key:'name',keys:dataset.details.services.dom[item.attr('data-id')], href:"?p=services&v=details&id="+dataset.details.services.dom[item.attr('data-id')].name, modal:true });
													});
												}
											});
										}
										API.Plugins.calls.Events.services(dataset,layout);
									}
								}
								// Update Call Window
								// Update Widget Window
								if(API.Plugins.calls.GUI.toast.element.find('div[data-id="'+call.id+'"]').length > 0){
									API.Plugins.calls.GUI.toast.element.find('div[data-id="'+call.id+'"]').remove();
								}
								if(callback != null){ callback(dataset,record.output.raw); }
							}
						});
						modal.modal('hide');
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
}

API.Plugins.calls.init();
