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
						for(var [key, call] of Object.entries(dataset.output.calls.raw)){
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
	},
	GUI:{
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
					if(API.debug){ toast.find('img').off().click(function(){ console.log(toast); }); }
					toast.find('a').off().click(function(){
						API.CRUD.read.show({ key:'name',keys:dataset.this.dom, href:"?p=organizations&v=details&id="+dataset.this.dom.name, modal:true });
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
									if(API.Auth.validate('custom', 'organizations_notes', 1)){
										if(API.Helper.isSet(record,['output','note','dom'])){
							        API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
							          item.find('.timeline-footer').remove();
							          if(API.Auth.validate('custom', 'organizations_notes', 4)){
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
									if(API.Auth.validate('custom', 'organizations_notes', 1)){
										if(API.Helper.isSet(record,['output','note','dom'])){
							        API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
							          item.find('.timeline-footer').remove();
							          if(API.Auth.validate('custom', 'organizations_notes', 4)){
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
										if(issue.status <= statusOrder){
											if(issue.status == statusOrder){
												html += '<option value="'+statusOrder+'" selected="selected">'+API.Contents.Language[status.name]+'</option>';
											} else {
												html += '<option value="'+statusOrder+'">'+API.Contents.Language[status.name]+'</option>';
											}
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
												if(API.Auth.validate('custom', 'organizations_notes', 1)){
													if(API.Helper.isSet(record,['output','note','dom'])){
										        API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
										          item.find('.timeline-footer').remove();
										          if(API.Auth.validate('custom', 'organizations_notes', 4)){
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
															layout.details.find('td[data-plugin="organizations"][data-key="issues"] div[data-id="'+id+'"]').remove();
															if(layout.details.find('td[data-plugin="organizations"][data-key="issues"]').find('button[data-action="link"]').length <= 0){
																layout.details.find('td[data-plugin="organizations"][data-key="issues"]').append(
																	API.Plugins.organizations.GUI.buttons.details(dataset.relations.issues[id],{
																		remove:API.Auth.validate('custom', 'organizations_issues', 4),
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
																layout.details.find('td[data-plugin="organizations"][data-key="issues"]').find('button[data-action="link"]').before(
																	API.Plugins.organizations.GUI.buttons.details(dataset.relations.issues[id],{
																		remove:API.Auth.validate('custom', 'organizations_issues', 4),
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
															API.Plugins.organizations.Events.issues(dataset,layout);
														}
													}
												}
												if(API.Helper.isSet(record,['output','services'])){
													for(var [id, service] of Object.entries(record.output.services)){
														API.Helper.set(dataset,['details','services','dom',id],record.output.services[id]);
														API.Helper.set(dataset,['details','services','raw',id],record.output.services[id]);
														API.Helper.set(dataset,['relations','services',id],record.output.services[id]);
														dataset.relations.services[id].created = API.Helper.toString(new Date());
														layout.details.find('td[data-plugin="organizations"][data-key="services"] div[data-id="'+id+'"]').remove();
														if(layout.details.find('td[data-plugin="organizations"][data-key="services"]').find('button[data-action="link"]').length <= 0){
															layout.details.find('td[data-plugin="organizations"][data-key="services"]').append(
																API.Plugins.organizations.GUI.buttons.details(dataset.relations.services[id],{
																	remove:API.Auth.validate('custom', 'organizations_services', 4),
																	icon:{details:"fas fa-hand-holding-usd"}
																})
															);
														} else {
															layout.details.find('td[data-plugin="organizations"][data-key="services"]').find('button[data-action="link"]').before(
																API.Plugins.organizations.GUI.buttons.details(dataset.relations.services[id],{
																	remove:API.Auth.validate('custom', 'organizations_services', 4),
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
													API.Plugins.organizations.Events.services(dataset,layout);
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
									if(API.Auth.validate('custom', 'organizations_notes', 1)){
										if(API.Helper.isSet(record,['output','note','dom'])){
											API.Builder.Timeline.add.card(layout.timeline,record.output.note.dom,'sticky-note','warning',function(item){
												item.find('.timeline-footer').remove();
												if(API.Auth.validate('custom', 'organizations_notes', 4)){
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
												layout.details.find('td[data-plugin="organizations"][data-key="issues"] div[data-id="'+id+'"]').remove();
												if(layout.details.find('td[data-plugin="organizations"][data-key="issues"]').find('button[data-action="link"]').length <= 0){
													layout.details.find('td[data-plugin="organizations"][data-key="issues"]').append(
														API.Plugins.organizations.GUI.buttons.details(dataset.relations.issues[id],{
															remove:API.Auth.validate('custom', 'organizations_issues', 4),
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
													layout.details.find('td[data-plugin="organizations"][data-key="issues"]').find('button[data-action="link"]').before(
														API.Plugins.organizations.GUI.buttons.details(dataset.relations.issues[id],{
															remove:API.Auth.validate('custom', 'organizations_issues', 4),
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
												API.Plugins.organizations.Events.issues(dataset,layout);
											}
										}
									}
									if(API.Helper.isSet(record,['output','services'])){
										for(var [id, service] of Object.entries(record.output.services)){
											API.Helper.set(dataset,['details','services','dom',id],record.output.services[id]);
											API.Helper.set(dataset,['details','services','raw',id],record.output.services[id]);
											API.Helper.set(dataset,['relations','services',id],record.output.services[id]);
											dataset.relations.services[id].created = API.Helper.toString(new Date());
											layout.details.find('td[data-plugin="organizations"][data-key="services"] div[data-id="'+id+'"]').remove();
											if(layout.details.find('td[data-plugin="organizations"][data-key="services"]').find('button[data-action="link"]').length <= 0){
												layout.details.find('td[data-plugin="organizations"][data-key="services"]').append(
													API.Plugins.organizations.GUI.buttons.details(dataset.relations.services[id],{
														remove:API.Auth.validate('custom', 'organizations_services', 4),
														icon:{details:"fas fa-hand-holding-usd"}
													})
												);
											} else {
												layout.details.find('td[data-plugin="organizations"][data-key="services"]').find('button[data-action="link"]').before(
													API.Plugins.organizations.GUI.buttons.details(dataset.relations.services[id],{
														remove:API.Auth.validate('custom', 'organizations_services', 4),
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
										API.Plugins.organizations.Events.services(dataset,layout);
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
// 		details:function(){
// 			var container = $('div[data-plugin="calls"][data-id]').last();
// 			var url = new URL(window.location.href);
// 			var id = url.searchParams.get("id"), values = '', main = container.find('#calls_main_card'), timeline = container.find('#calls_timeline'),details = container.find('#calls_details').find('table');
// 			if(container.parent('.modal-body').length > 0){
// 				var thisModal = container.parent('.modal-body').parent().parent().parent();
// 				thisModal.find('.modal-header').find('.btn-group').find('[data-control="update"]').remove();
// 			}
// 			API.request(url.searchParams.get("p"),'get',{data:{id:id}},function(result){
// 				var dataset = JSON.parse(result);
// 				if(dataset.success != undefined){
// 					container.attr('data-id',dataset.output.this.raw.id);
// 					var tr = $('tr[data-id="'+dataset.output.this.raw.id+'"][data-type="calls"]');
// 					var organizationCTN = tr.parents().eq(9);
// 					API.GUI.insert(dataset.output.this.dom);
// 					// Create Call Widget
// 					if(typeof thisModal !== 'undefined'){
// 						thisModal.on('hide.bs.modal',function(){
// 							// API.Plugins.calls.Widgets.toast(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues);
// 						});
// 					}
// 					// Subscribe
// 					if(API.Helper.isSet(dataset.output.details,['users','raw',API.Contents.Auth.User.id])){
// 						main.find('.card-header').find('button[data-action="unsubscribe"]').show();
// 					} else { main.find('.card-header').find('button[data-action="subscribe"]').show(); }
// 					main.find('.card-header').find('button[data-action="unsubscribe"]').click(function(){
// 						API.request(url.searchParams.get("p"),'unsubscribe',{data:{id:dataset.output.this.raw.id}},function(answer){
// 							var subscription = JSON.parse(answer);
// 							if(subscription.success != undefined){
// 								main.find('.card-header').find('button[data-action="unsubscribe"]').hide();
// 								main.find('.card-header').find('button[data-action="subscribe"]').show();
// 								container.find('#calls_timeline').find('[data-type=user][data-id="'+API.Contents.Auth.User.id+'"]').remove();
// 							}
// 						});
// 					});
// 					main.find('.card-header').find('button[data-action="subscribe"]').click(function(){
// 						API.request(url.searchParams.get("p"),'subscribe',{data:{id:dataset.output.this.raw.id}},function(answer){
// 							var subscription = JSON.parse(answer);
// 							if(subscription.success != undefined){
// 								main.find('.card-header').find('button[data-action="subscribe"]').hide();
// 								main.find('.card-header').find('button[data-action="unsubscribe"]').show();
// 								var sub = {
// 									id:API.Contents.Auth.User.id,
// 									created:subscription.output.relationship.created,
// 									email:API.Contents.Auth.User.email,
// 								};
// 								API.Builder.Timeline.add.subscription(container.find('#calls_timeline'),sub,'user','lightblue');
// 							}
// 						});
// 					});
// 					// Name
// 					if((dataset.output.this.raw.contact != null)&&(dataset.output.this.raw.contact != '')&&(API.Helper.isSet(dataset.output.details,['users','dom',dataset.output.this.raw.contact]))){
// 						var contact = dataset.output.details.users.dom[dataset.output.this.raw.contact];
// 							contact.name = '';
// 							if(contact.first_name != ''){ contact.name += contact.first_name}
// 							if(contact.middle_name != ''){ if(contact.name != ''){contact.name += ' ';} contact.name += contact.middle_name}
// 							if(contact.last_name != ''){ if(contact.name != ''){contact.name += ' ';} contact.name += contact.last_name}
// 							if(contact.job_title != ''){ if(contact.name != ''){contact.name += ' - ';} contact.name += contact.job_title}
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="name"]').html(contact.name);
// 					} else {
// 						if(API.Helper.isSet(dataset.output.details,['organizations'])){
// 							container.find('#calls_details').find('td[data-plugin="calls"][data-key="name"]').html(dataset.output.details.organizations.dom[Object.keys(dataset.output.details.organizations.dom)[0]].name);
// 						}
// 					}
// 					// Status
// 					if(API.Auth.validate('custom', 'calls_status', 1)){
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').parent().show();
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').html('<span class="badge bg-'+API.Contents.Statuses.calls[dataset.output.this.dom.status].color+'"><i class="'+API.Contents.Statuses.calls[dataset.output.this.dom.status].icon+' mr-1" aria-hidden="true"></i>'+API.Contents.Language[API.Contents.Statuses.calls[dataset.output.this.dom.status].name]+'</span>');
// 						container.find('#calls_notes select[name="status"]').show();
// 						for(var [statusOrder, statusInfo] of Object.entries(API.Contents.Statuses.calls)){
// 							container.find('#calls_notes select[name="status"]').append(new Option(API.Contents.Language[statusInfo.name], statusOrder));
// 						}
// 						container.find('#calls_notes select[name="status"]').val(dataset.output.this.dom.status);
// 					} else {
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="status"]').parent().remove();
// 						container.find('#calls_notes select[name="status"]').remove();
// 					}
// 					// Schedule
// 					if(API.Auth.validate('custom', 'calls_schedule', 1)){
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="schedule"]').parent().show();
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="schedule"]').html('<span class="badge bg-primary"><i class="fas fa-calendar-day mr-1" aria-hidden="true"></i>'+dataset.output.this.dom.date+' at '+dataset.output.this.dom.time+'</span>');
// 					} else { container.find('#calls_details').find('td[data-plugin="calls"][data-key="schedule"]').parent().remove(); }
// 					// Phone
// 					if(API.Auth.validate('custom', 'calls_phone', 1)){
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="phone"]').parent().show();
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="phone"]').html('<a class="btn btn-xs btn-success" href="tel:'+dataset.output.this.dom.phone+'"><i class="fas fa-phone mr-1"></i>'+dataset.output.this.dom.phone+'</a>');
// 					} else { container.find('#calls_details').find('td[data-plugin="calls"][data-key="phone"]').parent().remove(); }
// 					// User
// 					if(API.Auth.validate('custom', 'calls_users', 1)){
// 						container.find('#calls_details').find('a[data-plugin="calls"][data-key="user"]').parent().parent().show();
// 						container.find('#calls_details').find('td[data-plugin="calls"][data-key="user"]').html('<button class="btn btn-xs btn-primary"><i class="fas fa-user mr-1"></i>'+dataset.output.this.dom.assigned_to+'</button>');
// 					} else { container.find('#calls_details').find('a[data-plugin="calls"][data-key="user"]').parent().remove(); }
// 					// Created
// 					container.find('#calls_created').find('time').attr('datetime',dataset.output.this.raw.created.replace(/ /g, "T"));
// 					container.find('#calls_created').find('time').html(dataset.output.this.raw.created);
// 					container.find('#calls_created').find('time').timeago();
// 					// Issues
// 					for(var [relationshipsID, relations] of Object.entries(dataset.output.relationships)){
// 						for(var [key, relation] of Object.entries(relations)){
// 							if(relation.relationship == 'issues'){
// 								dataset.output.details.issues.dom[relation.link_to].status = dataset.output.details.statuses.dom[relation.statuses].order;
// 								dataset.output.details.issues.raw[relation.link_to].status = dataset.output.details.statuses.raw[relation.statuses].order;
// 							}
// 						}
// 					}
// 					// Notes
// 					if((API.Auth.validate('custom', 'calls_notes', 2))&&(dataset.output.this.raw.status < 4)){
// 						container.find('#calls_main_card_tabs .nav-item .nav-link[href="#calls_notes"]').parent().show();
// 						container.find('#calls_notes_textarea').find('textarea').summernote({
// 							toolbar: [
// 								['font', ['fontname', 'fontsize']],
// 								['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
// 								['color', ['color']],
// 								['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
// 							],
// 							height: 250,
// 						});
// 						container.find('#calls_notes').find('button[data-action="reply"]').click(function(){
// 							var note = {
// 								by:API.Contents.Auth.User.id,
// 								content:container.find('#calls_notes_textarea').find('textarea').summernote('code'),
// 								relationship:'calls',
// 								link_to:dataset.output.this.dom.id,
// 							};
// 							container.find('#calls_notes_textarea').find('textarea').val('');
// 							container.find('#calls_notes_textarea').find('textarea').summernote('code','');
// 							container.find('#calls_notes_textarea').find('textarea').summernote('destroy');
// 							container.find('#calls_notes_textarea').find('textarea').summernote({
// 								toolbar: [
// 									['font', ['fontname', 'fontsize']],
// 									['style', ['bold', 'italic', 'underline', 'strikethrough', 'superscript', 'subscript', 'clear']],
// 									['color', ['color']],
// 									['paragraph', ['style', 'ul', 'ol', 'paragraph', 'height']],
// 								],
// 								height: 250,
// 							});
// 							if((note.content != "")&&(note.content != "<p><br></p>")&&(note.content != "<p></p>")&&(note.content != "<br>")){
// 								API.request('calls','note',{data:note},function(result){
// 									var data = JSON.parse(result);
// 									if(data.success != undefined){
// 										API.Builder.Timeline.add.card(container.find('#calls_timeline'),data.output.note.dom,'sticky-note','warning',function(item){
// 											item.find('.timeline-footer').remove();
// 										});
// 									}
// 								});
// 								container.find('#calls_main_card_tabs a[href="#calls"]').tab('show');
// 							} else { alert('Note is empty'); }
// 						});
// 					} else {
// 						container.find('#calls_main_card_tabs .nav-item .nav-link[href="#calls_notes"]').parent().remove();
// 						container.find('#calls_notes').remove();
// 					}
// 					// Creating Timeline
// 					// Adding items
// 					for(var [rid, relations] of Object.entries(dataset.output.relationships)){
// 						for(var [uid, relation] of Object.entries(relations)){
// 							if(API.Helper.isSet(dataset.output.details,[relation.relationship,'dom',relation.link_to])){
// 								var detail = {};
// 								for(var [key, value] of Object.entries(dataset.output.details[relation.relationship].dom[relation.link_to])){ detail[key] = value; }
// 								detail.owner = relation.owner; detail.created = relation.created;
// 								switch(relation.relationship){
// 									case"status":
// 									case"statuses":
// 										if((API.Auth.validate('custom', 'calls_status', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 											API.Builder.Timeline.add.status(container.find('#calls_timeline'),detail);
// 										}
// 										break;
// 									case"organizations":
// 										if((API.Auth.validate('custom', 'calls_organizations', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 											API.Builder.Timeline.add.client(container.find('#calls_timeline'),detail,'building');
// 										}
// 										break;
// 									case"contacts":
// 									case"users":
// 										detail.name = '';
// 										if((detail.first_name != '')&&(detail.first_name != null)){ if(detail.name != ''){detail.name += ' ';} detail.name += detail.first_name; }
// 										if((detail.middle_name != '')&&(detail.middle_name != null)){ if(detail.name != ''){detail.name += ' ';} detail.name += detail.middle_name; }
// 										if((detail.last_name != '')&&(detail.last_name != null)){ if(detail.name != ''){detail.name += ' ';} detail.name += detail.last_name; }
// 										if(detail.isContact){
// 											if((API.Auth.validate('custom', 'calls_contacts', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 												API.Builder.Timeline.add.contact(container.find('#calls_timeline'),detail,'address-card');
// 											}
// 										} else if((API.Auth.validate('custom', 'calls_users', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 											API.Builder.Timeline.add.user(container.find('#calls_timeline'),detail,'user','lightblue');
// 										}
// 										break;
// 									case"services":
// 										if((API.Auth.validate('custom', 'calls_services', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 											API.Builder.Timeline.add.service(container.find('#calls_timeline'),detail);
// 										}
// 										break;
// 									case"issues":
// 										if((API.Auth.validate('custom', 'calls_issues', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 											if(API.Helper.isSet(dataset.output.details.statuses.raw,[relation.statuses,'order'])){
// 												detail.status = dataset.output.details.statuses.raw[relation.statuses].order;
// 												API.Builder.Timeline.add.issue(container.find('#calls_timeline'),detail);
// 											}
// 										}
// 										break;
// 									case"notes":
// 										if((API.Auth.validate('custom', 'calls_notes', 1))||(detail.owner == API.Contents.Auth.User.username)){
// 											API.Builder.Timeline.add.card(container.find('#calls_timeline'),detail,'sticky-note','warning',function(item){
// 												item.find('.timeline-footer').remove();
// 											});
// 										}
// 										break;
// 									default:
// 										console.log(relation.relationship);
// 										API.Builder.Timeline.add.card(container.find('#calls_timeline'),detail);
// 										break;
// 								}
// 							}
// 						}
// 					}
// 					// Radio Selector
// 					var timelineHTML = '';
// 					timelineHTML += '<div class="btn-group btn-group-toggle" data-toggle="buttons">';
// 						timelineHTML += '<label class="btn btn-primary pointer active" data-table="all">';
// 							timelineHTML += '<input type="radio" name="options" autocomplete="off" checked>All';
// 						timelineHTML += '</label>';
// 						for(var [table, content] of Object.entries(dataset.output.details)){
// 							if(API.Auth.validate('custom', 'calls_'+table, 1)){
// 								timelineHTML += '<label class="btn btn-primary pointer" data-table="'+table+'">';
// 									timelineHTML += '<input type="radio" name="options" autocomplete="off">'+API.Helper.ucfirst(table);
// 								timelineHTML += '</label>';
// 							} else { console.log('calls_'+table); }
// 						}
// 					timelineHTML += '</div>';
// 					container.find('#calls_timeline').find('.time-label').first().html(timelineHTML);
// 					container.find('#calls_timeline').find('.time-label').first().find('label').each(function(){
// 						switch($(this).attr('data-table')){
// 							case"notes":var icon = 'sticky-note';break;
// 							case"comments":var icon = 'comment';break;
// 							case"statuses":var icon = 'info';break;
// 							case"users":var icon = 'user';break;
// 							case"organizations":var icon = 'building';break;
// 							case"contacts":var icon = 'address-card';break;
// 							case"calls":var icon = 'phone-square';break;
// 							case"services":var icon = 'hand-holding-usd';break;
// 							case"issues":var icon = 'gavel';break;
// 							default:var icon = '';break;
// 						}
// 						if((icon != '')&&(typeof icon !== 'undefined')){
// 							$(this).click(function(){
// 								container.find('#calls_timeline').find('[data-type]').hide();
// 								container.find('#calls_timeline').find('[data-type="'+icon+'"]').show();
// 							});
// 						} else {
// 							$(this).click(function(){
// 								container.find('#calls_timeline').find('[data-type]').show();
// 							});
// 						}
// 					});
// 					// Controls
// 					var callHTML = '';
// 					callHTML += '<thead>';
// 						callHTML += '<tr>';
// 							callHTML += '<th colspan="2">';
// 								callHTML += '<div class="btn-group btn-block" style="display:none">';
// 									callHTML += '<button class="btn btn-success" data-action="start"><i class="fas fa-phone mr-1"></i>Start</button>';
// 									callHTML += '<button class="btn btn-danger" data-action="cancel"><i class="fas fa-phone-slash mr-1"></i>Cancel</button>';
// 									callHTML += '<button class="btn btn-primary" data-action="reschedule"><i class="fas fa-calendar-day mr-1"></i>Re-Schedule</button>';
// 								callHTML += '</div>';
// 								callHTML += '<div class="btn-group btn-block" style="display:none">';
// 									callHTML += '<button class="btn btn-danger" data-action="end"><i class="fas fa-phone-slash mr-1"></i>End</button>';
// 								callHTML += '</div>';
// 							callHTML += '</th>';
// 						callHTML += '</tr>';
// 					callHTML += '</thead>';
// 					container.find('#calls_details').find('table').prepend(callHTML);
// 					if(dataset.output.this.raw.status <= 2){
// 						container.find('#calls_details').find('table').find('thead').find('.btn-group').first().show();
// 					}
// 					if(dataset.output.this.raw.status == 3){
// 						container.find('#calls_details').find('table').find('thead').find('.btn-group').last().show();
// 					}
// 					if(dataset.output.this.raw.status >= 4){
// 						container.find('#calls_details').find('table').find('thead').remove();
// 					}
// 					// Controls Events
// 					container.find('#calls_details').find('table').find('thead').find('button').each(function(){
// 						var control = $(this), action = $(this).attr('data-action');
// 						switch(action){
// 							case"start":
// 								control.click(function(){
// 									API.Plugins.calls.Events.start(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
// 										dataset.output.this.raw.status = data.call.raw.status;
// 										dataset.output.this.dom.status = data.call.dom.status;
// 									});
// 								});
// 								break;
// 							case"cancel":
// 								control.click(function(){
// 									API.Plugins.calls.Events.cancel(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
// 										dataset.output.this.raw.status = data.call.raw.status;
// 										dataset.output.this.dom.status = data.call.dom.status;
// 									});
// 								});
// 								break;
// 							case"reschedule":
// 								control.click(function(){
// 									API.Plugins.calls.Events.reschedule(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
// 										dataset.output.this.raw.status = data.call.raw.status;
// 										dataset.output.this.dom.status = data.call.dom.status;
// 									});
// 								});
// 								break;
// 							case"end":
// 								control.click(function(){
// 									API.Plugins.calls.Events.end(dataset.output.this,{dom:dataset.output.details.organizations.dom[dataset.output.this.raw.organization],raw:dataset.output.details.organizations.raw[dataset.output.this.raw.organization]},dataset.output.details.issues,function(data,objects){
// 										dataset.output.this.raw.status = data.call.raw.status;
// 										dataset.output.this.dom.status = data.call.dom.status;
// 									});
// 								});
// 								break;
// 						}
// 					});
// 				}
// 			});
// 		},
// 	},

API.Plugins.calls.init();
