<div data-plugin="calls" data-id="">
	<span data-plugin="calls" data-key="id" style="display:none;"></span>
	<span data-plugin="calls" data-key="date" style="display:none;"></span>
	<span data-plugin="calls" data-key="time" style="display:none;"></span>
	<span data-plugin="calls" data-key="status" style="display:none;"></span>
	<span data-plugin="calls" data-key="contact" style="display:none;"></span>
	<span data-plugin="calls" data-key="assigned_to" style="display:none;"></span>
	<div class="row">
		<div class="col-md-4 col-sm-12">
			<div class="card" id="calls_details">
	      <div class="card-header d-flex p-0">
	        <h3 class="card-title p-3">Call Details</h3>
	      </div>
	      <div class="card-body p-0">
					<div class="row">
						<div class="col-12 p-4 text-center">
							<img class="profile-user-img img-fluid img-circle" style="height:150px;width:150px;" src="/dist/img/default.png">
						</div>
						<div class="col-12 pt-2 pl-2 pr-2 pb-0 m-0">
							<table class="table table-striped table-hover m-0">
								<tbody>
									<tr>
										<td><b>Name</b></td>
										<td data-plugin="calls" data-key="name"></td>
									</tr>
									<tr style="display:none;">
										<td><b>Status</b></td>
										<td data-plugin="calls" data-key="status"></td>
									</tr>
									<tr style="display:none;">
										<td><b>Schedule</b></td>
										<td data-plugin="calls" data-key="schedule"></td>
									</tr>
									<tr style="display:none;">
										<td><b>Phone</b></td>
										<td data-plugin="calls" data-key="phone"></td>
									</tr>
									<tr>
										<td><b>Assigned to</b></td>
										<td data-plugin="calls" data-key="user"></td>
									</tr>
									<tr>
										<td><b>Created</b></td>
										<td id="calls_created"><time class="timeago"></time></td>
									</tr>
								</tbody>
							</table>
				    </div>
			    </div>
				</div>
	    </div>
		</div>
		<div class="col-md-8 col-sm-12">
			<div class="card" id="calls_main_card">
	      <div class="card-header d-flex p-0">
	        <ul class="nav nav-pills p-2" id="calls_main_card_tabs">
	          <li class="nav-item"><a class="nav-link active" href="#calls" data-toggle="tab"><i class="fas fa-history mr-1"></i>History</a></li>
	          <li class="nav-item" style="display:none;"><a class="nav-link" href="#calls_notes" data-toggle="tab"><i class="fas fa-sticky-note mr-1"></i>Note</a></li>
	        </ul>
					<div class="btn-group ml-auto">
						<button type="button" data-action="subscribe" style="display:none;" class="btn"><i class="fas fa-bell"></i></button>
						<button type="button" data-action="unsubscribe" style="display:none;" class="btn"><i class="fas fa-bell-slash"></i></button>
					</div>
	      </div>
	      <div class="card-body p-0">
	        <div class="tab-content">
	          <div class="tab-pane p-3 active" id="calls">
							<div class="timeline" id="calls_timeline"></div>
						</div>
	          <div class="tab-pane p-0" id="calls_notes">
							<div id="calls_notes_textarea">
								<textarea title="Note" name="note" class="form-control"></textarea>
							</div>
							<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
						    <form class="form-inline my-2 my-lg-0 ml-auto">
						      <button class="btn btn-primary my-2 my-sm-0" type="button" data-action="reply"><i class="fas fa-reply mr-1"></i>Reply</button>
						    </form>
							</nav>
	          </div>
	        </div>
	      </div>
	    </div>
		</div>
	</div>
</div>
