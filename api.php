<?php
class callsAPI extends CRUDAPI {

	public function getActive($request = null, $data = null){
		if((isset($data))&&(!is_array($data))){ $data = json_decode($data, true); }
		$this->Auth->setLimit(0);
		// Init Vars
		$calls = ["dom" => [], "raw" => []];
		$organizations = ["dom" => [], "raw" => []];
		$issues = ["dom" => [], "raw" => []];
		// Fetch all active Calls
		$activeCalls = $this->Auth->query('SELECT * FROM `calls` WHERE `assigned_to` = ? AND `status` = ?',$this->Auth->User['id'],3)->fetchAll();
		if($activeCalls != null){
			$activeCalls = $activeCalls->all();
			foreach($activeCalls as $key => $call){
				$calls['raw'][$call['id']] = $call;
				$calls['dom'][$call['id']] = $this->convertToDOM($call);
				// Fetch Organizations
				if($this->Auth->valid('table','organizations',1)){
					if((isset($call['organization']))&&($call['organization'] != null)&&($call['organization'] != '')){
						if(!isset($organizations['raw'][$call['organization']],$organizations['dom'][$call['organization']])){
							$organization = $this->Auth->query('SELECT * FROM `organizations` WHERE `id` = ?',$call['organization'])->fetchAll();
							if($organization != null){
								$organizations['raw'][$call['organization']] = $organization->all()[0];
								$organizations['dom'][$call['organization']] = $this->convertToDOM($organizations['raw'][$call['organization']]);
							}
						}
					}
				}
				// Fetch Issues
				if($this->Auth->valid('table','issues',1)){
					$relationships = $this->getRelationships('calls',$call['id']);
					foreach($relationships as $relations){
						foreach($relations as $relation){
							if($relation['relationship'] == 'issues'){
								if(!isset($issues['raw'][$relation['link_to']],$issues['dom'][$relation['link_to']])){
									$issue = $this->Auth->query('SELECT * FROM `issues` WHERE `id` = ?',$relation['link_to'])->fetchAll();
									if($issue != null){
										$issues['raw'][$relation['link_to']] = $issue->all()[0];
										$issues['dom'][$relation['link_to']] = $this->convertToDOM($issues['raw'][$relation['link_to']]);
									}
								}
							}
						}
					}
				}
			}
			// Return
			return [
				"success" => $this->Language->Field["This request was successfull"],
				"request" => $request,
				"data" => $data,
				"output" => [
					'calls' => $calls,
					'organizations' => $organizations,
					'issues' => $issues,
				],
			];
		} else {
			// Return
			return [
				"error" => $this->Language->Field["You are not allowed to access this record"],
				"request" => $request,
				"data" => $data,
				"output" => [
					'calls' => $calls,
					'organizations' => $organizations,
					'issues' => $issues,
				],
			];
		}
	}

	public function start($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$this->Auth->setLimit(0);
			$call = $this->Auth->read('calls',$data['id']);
			if($call != null){
				$call = $call->all()[0];
				// Update Current Call
				if(isset($data['status'],$data['status'])){ $call['status'] = $data['status']; }
				$return = parent::update($request, $call);
				// Get Status
				$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `type` = ? AND `order` = ?','calls',$call['status'])->fetchAll()->all()[0];
				// Create Call Status
				$this->Auth->create('relationships',[
					'relationship_1' => 'organizations',
					'link_to_1' => $call['organization'],
					'relationship_2' => $request,
					'link_to_2' => $call['id'],
					'relationship_3' => 'statuses',
					'link_to_3' => $status['id'],
				]);
				// Return
				return $return;
			}
		}
	}

	public function end($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$this->Auth->setLimit(0);
			$call = $this->Auth->read('calls',$data['id']);
			if($call != null){
				$call = $call->all()[0];
				$callRelationships = $this->getRelationships($request,$data['id']);
				$issues = [];
				foreach($callRelationships as $id => $relationships){
					foreach($relationships as $relationship){
						if($relationship['relationship'] == 'organizations'){ $organizationID = $relationship['link_to']; }
						if($relationship['relationship'] == 'issues'){ $issues[$relationship['link_to']] = $relationship['statuses']; }
					}
				}
				if(isset($data['form']['date'],$data['form']['time'])){ $call['status'] = 4; } else { $call['status'] = 5; }
				// Update Current Call
				$return = parent::update($request, $call);
				// Get Status
				$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `type` = ? AND `order` = ?','calls',$call['status'])->fetchAll()->all()[0];
				$this->Auth->create('relationships',[
					'relationship_1' => 'organizations',
					'link_to_1' => $organizationID,
					'relationship_2' => $request,
					'link_to_2' => $call['id'],
					'relationship_3' => 'statuses',
					'link_to_3' => $status['id'],
				]);
				// Fetch Linked Organization
				if(isset($organizationID)){
					$organization = $this->Auth->read('organizations',$organizationID);
					$organizationRelationships = [];
					if($organization != null){
						$organization = $organization->all()[0];
						$call['relationship'] = 'organizations';
						$call['link_to'] = $organizationID;
						$organizationRelationships = $this->getRelationships($request,$data['id']);
					}
					$services = [];
					$organizationIssues = [];
					foreach($organizationRelationships as $id => $relationships){
						foreach($relationships as $relationship){
							if($relationship['relationship'] == 'services'){ array_push($services,$relationship['link_to']); }
							if($relationship['relationship'] == 'issues'){ $organizationIssues[$relationship['link_to']] = $relationship['statuses']; }
						}
					}
				}
				// Update Issues
				if(isset($data['form']['issues'])){
					foreach($data['form']['issues'] as $issueID => $issueStatus){
						$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `type` = ? AND `order` = ?','issues',$issueStatus)->fetchAll()->all()[0];
						if($status['id'] != $issues[$issueID]){
							// Update Issue Status of Call
							$this->Auth->create('relationships',[
								'relationship_1' => 'issues',
								'link_to_1' => $issueID,
								'relationship_2' => 'calls',
								'link_to_2' => $call['id'],
								'relationship_3' => 'statuses',
								'link_to_3' => $status['id'],
							]);
							$return['output']['issues'][$issueID] = $this->Auth->read('issues',$issueID)->all()[0];
							$return['output']['issues'][$issueID] = $this->convertToDOM($return['output']['issues'][$issueID]);
							$return['output']['issues'][$issueID]['status'] = $status;
							// Update Issue Status of Organization
							if((isset($organizationID))&&($status['id'] != $organizationIssues[$issueID])){
								$this->Auth->create('relationships',[
									'relationship_1' => 'issues',
									'link_to_1' => $issueID,
									'relationship_2' => 'organizations',
									'link_to_2' => $organizationID,
									'relationship_3' => 'statuses',
									'link_to_3' => $status['id'],
								]);
							}
							// Verify Linked Services
							if($status['order'] >= 4){
								$issueRelationships = $this->getRelationships('issues',$issueID);
								foreach($issueRelationships as $relationshipID => $relationships){
									foreach($relationships as $relationship){
										if(($relationship['relationship'] == 'services')){
											// Adding new Service to Call
											$this->Auth->create('relationships',[
												'relationship_1' => 'calls',
												'link_to_1' => $call['id'],
												'relationship_2' => 'services',
												'link_to_2' => $relationship['link_to'],
											]);
											// Adding new Service to Organization
											if((isset($organizationID))&&(!in_array($relationship['link_to'],$services))){
												$this->Auth->create('relationships',[
													'relationship_1' => 'organizations',
													'link_to_1' => $organizationID,
													'relationship_2' => 'services',
													'link_to_2' => $relationship['link_to'],
												]);
												$service = $this->Auth->read('services',$relationship['link_to']);
												if($service != null){
													$return['output']['services'][$relationship['link_to']] = $service->all()[0];
													$return['output']['services'][$relationship['link_to']] = $this->convertToDOM($return['output']['services'][$relationship['link_to']]);
												}
												// Update isClient Switch
												$organization['isClient'] = 'true';
												$this->Auth->update('organizations',$organization,$organization['id']);
											}
										}
									}
								}
							}
						}
					}
				}
				// Create Note
				if(isset($data['form']['note'])){
					$note = [
						'by' => $this->Auth->User['id'],
						'content' => $data['form']['note'],
					];
					$noteID = $this->Auth->create('notes',$note);
					$return['output']['note']['raw'] = $this->Auth->read('notes',$noteID)->all()[0];
					$return['output']['note']['dom'] = $this->convertToDOM($return['output']['note']['raw']);
				}
				// Create Callback
				if($call['status'] == 4){
					$call['date'] = $data['form']['date'];
					$call['time'] = $data['form']['time'];
					$call['status'] = 1;
					unset($call['created']);
					$return['output']['new'] = $this->create($request, $call);
				}
				// Create Relationships
				$this->Auth->create('relationships',[
					'relationship_1' => $request,
					'link_to_1' => $data['id'],
					'relationship_2' => 'notes',
					'link_to_2' => $noteID,
				]);
				if(isset($organizationID)){
					$this->Auth->create('relationships',[
						'relationship_1' => 'organizations',
						'link_to_1' => $organizationID,
						'relationship_2' => 'notes',
						'link_to_2' => $noteID,
					]);
				}
				// Return
				return $return;
			}
		}
	}

	public function reschedule($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$this->Auth->setLimit(0);
			$callRelationships = $this->getRelationships($request,$data['id']);
			foreach($callRelationships as $id => $relationships){
				foreach($relationships as $relationship){
					if($relationship['relationship'] == 'organizations'){
						$organizationID = $relationship['link_to'];
					}
				}
			}
			$thiscall = $this->Auth->read('calls',$data['id'])->all()[0];
			$thiscall['status'] = 1;
			$thiscall['date'] = $data['newdate'];
			$thiscall['time'] = $data['newtime'];
			$thiscall['relationship'] = 'organizations';
			$thiscall['link_to'] = $organizationID;
			unset($thiscall['id']);
			unset($thiscall['created']);
			unset($thiscall['modified']);
			unset($thiscall['owner']);
			unset($thiscall['updated_by']);
			$return = $this->create($request, $thiscall);
			$newcall = $return;
			if(isset($return['success'])){
				$data['status'] = 4;
				$return = parent::update($request, $data);
				$return['output']['new'] = $newcall;
				if(isset($return['success'],$data['note'])){
					$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `type` = ? AND `order` = ?','calls',$data['status'])->fetchAll()->all()[0];
					if(isset($data['note'])){
						$note = [
							'by' => $this->Auth->User['id'],
							'content' => $data['note'],
						];
						$noteID = $this->Auth->create('notes',$note);
						$return['output']['note']['raw'] = $this->Auth->read('notes',$noteID)->all()[0];
						$return['output']['note']['dom'] = $this->convertToDOM($return['output']['note']['raw']);
						$this->Auth->create('relationships',[
							'relationship_1' => $request,
							'link_to_1' => $data['id'],
							'relationship_2' => 'notes',
							'link_to_2' => $noteID,
						]);
						$this->Auth->create('relationships',[
							'relationship_1' => 'organizations',
							'link_to_1' => $organizationID,
							'relationship_2' => 'notes',
							'link_to_2' => $noteID,
						]);
					}
					$this->Auth->create('relationships',[
						'relationship_1' => 'organizations',
						'link_to_1' => $organizationID,
						'relationship_2' => $request,
						'link_to_2' => $data['id'],
						'relationship_3' => 'statuses',
						'link_to_3' => $status['id'],
					]);
				}
			}
			// Return
			return $return;
		}
	}

	public function cancel($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$this->Auth->setLimit(0);
			$data['status'] = 6;
			$call = parent::update($request, $data);
			if(isset($call['success'],$data['note'])){
				$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `type` = ? AND `order` = ?','calls',$data['status'])->fetchAll()->all()[0];
				$note = [
					'by' => $this->Auth->User['id'],
					'content' => $data['note'],
				];
				$noteID = $this->Auth->create('notes',$note);
				$call['output']['note']['raw'] = $this->Auth->read('notes',$noteID)->all()[0];
				$call['output']['note']['dom'] = $this->convertToDOM($call['output']['note']['raw']);
				$this->Auth->create('relationships',[
					'relationship_1' => $request,
					'link_to_1' => $data['id'],
					'relationship_2' => 'notes',
					'link_to_2' => $noteID,
				]);
				$callRelationships = $this->getRelationships($request,$data['id']);
				foreach($callRelationships as $id => $relationships){
					foreach($relationships as $relationship){
						if($relationship['relationship'] == 'organizations'){
							$this->Auth->create('relationships',[
								'relationship_1' => $relationship['relationship'],
								'link_to_1' => $relationship['link_to'],
								'relationship_2' => 'notes',
								'link_to_2' => $noteID,
							]);
							$this->Auth->create('relationships',[
								'relationship_1' => $relationship['relationship'],
								'link_to_1' => $relationship['link_to'],
								'relationship_2' => $request,
								'link_to_2' => $data['id'],
								'relationship_3' => 'statuses',
								'link_to_3' => $status['id'],
							]);
						}
					}
				}
			}
			// Return
			return $call;
		}
	}

	public function note($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$this->Auth->setLimit(0);
			$note = parent::note($request, $data);
			if(isset($note['success'])){
				foreach($note['output']['relationships'] as $id => $relationships){
					foreach($relationships as $relationship){
						if($relationship['relationship'] == 'organizations'){
							$this->Auth->create('relationships',[
								'relationship_1' => $relationship['relationship'],
								'link_to_1' => $relationship['link_to'],
								'relationship_2' => 'notes',
								'link_to_2' => $note['output']['note']['raw']['id'],
							]);
						}
					}
				}
			}
			return $note;
		}
	}

	public function get($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$this->Auth->setLimit(0);
			$get = parent::get($request, $data);
			return $get;
		}
	}

	public function create($request = null, $data = null){
		if(!is_array($data)){ $data = json_decode($data, true); }
		if(isset($data['relationship'],$data['link_to'])){
			if((isset($data['contact']))&&($data['contact'] != '')&&($data['contact'] != null)){
				$data['phone'] = $this->Auth->query('SELECT * FROM `users` WHERE `id` = ?',$data['contact'])->fetchAll()->all()[0]['phone'];
			} else {
				$data['phone'] = $this->Auth->query('SELECT * FROM `'.$data['relationship'].'` WHERE `id` = ?',$data['link_to'])->fetchAll()->all()[0]['phone'];
			}
			if(isset($data['date'])){ $data['date'] = date_format(date_create($data['date']),"Y/m/d"); }
			if(isset($data['time'])){ $data['time'] = date_format(date_create($data['time']),"H:i:s"); }
			$data['organization'] = $data['link_to'];
			$results = parent::create($request, $data);
			if((isset($results['success'],$results['output']['raw']['assigned_to']))&&($results['output']['raw']['assigned_to'] != '')){
				parent::create('notifications',[
					'icon' => 'icon icon-calls mr-2',
					'subject' => 'You have a new call',
					'dissmissed' => 1,
					'user' => $results['output']['raw']['assigned_to'],
					'href' => '?p=calls&v=details&id='.$results['output']['raw']['id'],
				]);
				$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `type` = ? AND `order` = ?','calls',$data['status'])->fetchAll()->all()[0];
				$id = $this->Auth->create('relationships',[
					'relationship_1' => $data['relationship'],
					'link_to_1' => $data['link_to'],
					'relationship_2' => 'calls',
					'link_to_2' => $results['output']['raw']['id'],
					'relationship_3' => 'statuses',
					'link_to_3' => $status['id'],
				]);
				$this->Auth->create('relationships',[
					'relationship_1' => 'calls',
					'link_to_1' => $results['output']['raw']['id'],
					'relationship_2' => 'statuses',
					'link_to_2' => $status['id'],
				]);
				if(is_int($id)){
					$results['output']['relationship']['raw'] = $this->Auth->read('relationships',$id)->all()[0];
					$results['output']['relationship']['dom'] = $this->convertToDOM($results['output']['relationship']['raw']);
				}
				$id = $this->Auth->create('relationships',[
					'relationship_1' => 'users',
					'link_to_1' => $results['output']['raw']['assigned_to'],
					'relationship_2' => 'calls',
					'link_to_2' => $results['output']['raw']['id'],
				]);
				$relationships = $this->getRelationships($data['relationship'],$data['link_to']);
				$issues = [];
				foreach($relationships as $relationship){
					foreach($relationship as $relation){
						if($relation['relationship'] == 'issues'){ $issues[$relation['link_to']] = $relation['statuses']; }
					}
				}
				foreach($issues as $issueID => $issueStatus){
					$this->Auth->create('relationships',[
						'relationship_1' => 'issues',
						'link_to_1' => $issueID,
						'relationship_2' => 'calls',
						'link_to_2' => $results['output']['raw']['id'],
						'relationship_3' => 'statuses',
						'link_to_3' => $issueStatus,
					]);
				}
				if((isset($results['output']['raw']['contact']))&&($results['output']['raw']['contact'] != '')&&($results['output']['raw']['contact'] != null)){
					$id = $this->Auth->create('relationships',[
						'relationship_1' => 'users',
						'link_to_1' => $results['output']['raw']['contact'],
						'relationship_2' => 'calls',
						'link_to_2' => $results['output']['raw']['id'],
					]);
				}
				$results['output']['relationships'] = $this->getRelationships($data['relationship'],$data['link_to']);
			}
			return $results;
		}
	}
	public function delete($request = null, $data = null){
		if(!is_array($data)){ $data = json_decode($data, true); }
		$results = parent::delete($request, $data);
		$notes = $this->Auth->read('notes',$data['id'],'link_to');
		if($notes != null){ foreach($notes->all() as $note){ if($note['relationship'] == 'appointments'){ $this->Auth->delete('notes',$note['id']); } } }
		return $results;
	}
}
