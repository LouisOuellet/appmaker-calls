<?php
class callsAPI extends CRUDAPI {

	public function getActive($request = null, $data = null){
		if((isset($data))&&(!is_array($data))){ $data = json_decode($data, true); }
		$this->Auth->setLimit(0);
		// Init Vars
		$calls = ["dom" => [], "raw" => []];
		// Init Organization
		$API = new organizationsAPI;
		$organizations = [];
		// Fetch all active Calls
		$activeCalls = $this->Auth->query('SELECT * FROM `calls` WHERE `assigned_to` = ? AND `status` = ?',$this->Auth->User['id'],3)->fetchAll();
		if($activeCalls != null){
			$activeCalls = $activeCalls->all();
			foreach($activeCalls as $key => $call){
				$calls['raw'][$call['id']] = $call;
				$calls['dom'][$call['id']] = $this->convertToDOM($call);
				// Fetch Organizations
				$organizations[$call['organization']] = $API->get('organizations',['id' => $call['organization']]);
			}
			// Return
			return [
				"success" => $this->Language->Field["This request was successfull"],
				"request" => $request,
				"data" => $data,
				"output" => [
					'calls' => $calls,
					'organizations' => $organizations,
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
			if(isset($data['id'])){
				$call = $this->Auth->read('calls',$data['id']);
				if($call != null){
					$call = $call->all()[0];
					// Update Current Call
					if(isset($data['status'],$data['status'])){ $call['status'] = $data['status']; }
					$return = parent::update($request, $call);
					// Get Status
					$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `relationship` = ? AND `order` = ?','calls',$call['status'])->fetchAll()->all()[0];
					// Create Call Status
					$this->createRelationship([
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
	}

	public function end($request = null, $data = null){
		if(isset($data)){
			if(!is_array($data)){ $data = json_decode($data, true); }
			$return['request'] = $request;
			$return['data'] = $data;
			$this->Auth->setLimit(0);
			$call = $this->Auth->read('calls',$data['id']);
			if($call != null){
				$call = $call->all()[0];
				$call['status'] = $data['status'];
				$this->Auth->update('calls',$call,$call['id']);
				$return['success'] = $this->Language->Field["Record successfully updated"];
				$return['output']['dom'] = $this->convertToDOM($call);
				$return['output']['raw'] = $call;
				if(isset($data['issues'])){
					foreach($data['issues'] as $id => $value){
						$return['output']['issues'][$id] = $this->Auth->read('issues',$id)->all()[0];
						$return['output']['issues'][$id]['status'] = $value;
						$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `relationship` = ? AND `order` = ?','issues',$value)->fetchAll()->all()[0];
						$this->createRelationship([
							'relationship_1' => 'issues',
							'link_to_1' => $id,
							'relationship_2' => 'organizations',
							'link_to_2' => $call['organization'],
							'relationship_3' => 'statuses',
							'link_to_3' => $status['id'],
						]);
						$this->createRelationship([
							'relationship_1' => 'issues',
							'link_to_1' => $id,
							'relationship_2' => 'calls',
							'link_to_2' => $call['id'],
							'relationship_3' => 'statuses',
							'link_to_3' => $status['id'],
						]);
						if($return['output']['issues'][$id]['status'] >= 4){
							$services = $this->Auth->query('SELECT * FROM `relationships` WHERE (`relationship_1` = ? AND `link_to_1` = ? AND `relationship_2` = ?) || (`relationship_2` = ? AND `link_to_2` = ? AND `relationship_1` = ?)','issues',$id,'services','issues',$id,'services');
							if($services->numRows() > 0){
								$services = $services->fetchAll()->all();
								foreach($services as $service){
									$service = $this->Auth->read('services',$service['link_to_2'])->all()[0];
									$return['output']['services'][$service['id']] = $service;
									$this->createRelationship([
										'relationship_1' => 'organizations',
										'link_to_1' => $call['organization'],
										'relationship_2' => 'services',
										'link_to_2' => $service['id'],
									]);
									$this->createRelationship([
										'relationship_1' => 'calls',
										'link_to_1' => $call['id'],
										'relationship_2' => 'services',
										'link_to_2' => $service['id'],
									]);
								}
							}
						}
					}
				}
				if(isset($data['note'])){
					$return['output']['note']['raw'] = $this->Auth->create('notes',[
						'content' => $data['note'],
						'by' => $this->Auth->User['id'],
						'relationship' => 'organizations',
						'link_to' => $call['organization'],
					]);
					$return['output']['note']['raw'] = $this->Auth->read('notes',$return['output']['note']['raw'])->all()[0];
					$return['output']['note']['dom'] = $this->convertToDOM($return['output']['note']['raw']);
					$this->createRelationship([
						'relationship_1' => 'organizations',
						'link_to_1' => $call['organization'],
						'relationship_2' => 'notes',
						'link_to_2' => $return['output']['note']['raw']['id'],
					]);
					$this->createRelationship([
						'relationship_1' => 'calls',
						'link_to_1' => $call['id'],
						'relationship_2' => 'notes',
						'link_to_2' => $return['output']['note']['raw']['id'],
					]);
				}
				if($call['status'] == 4){ $return['output']['new'] = $this->create('calls',[
					'relationship' => 'organizations',
					'link_to' => $call['organization'],
					'status' => 1,
					'date' => $data['date'],
					'time' => $data['time'],
					'contact' => $data['contact'],
					'assigned_to' => $data['assigned_to'],
				]); }
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
					$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `relationship` = ? AND `order` = ?','calls',$data['status'])->fetchAll()->all()[0];
					if(isset($data['note'])){
						$note = [
							'by' => $this->Auth->User['id'],
							'content' => $data['note'],
						];
						$noteID = $this->Auth->create('notes',$note);
						$return['output']['note']['raw'] = $this->Auth->read('notes',$noteID)->all()[0];
						$return['output']['note']['dom'] = $this->convertToDOM($return['output']['note']['raw']);
						$this->createRelationship([
							'relationship_1' => $request,
							'link_to_1' => $data['id'],
							'relationship_2' => 'notes',
							'link_to_2' => $noteID,
						]);
						$this->createRelationship([
							'relationship_1' => 'organizations',
							'link_to_1' => $organizationID,
							'relationship_2' => 'notes',
							'link_to_2' => $noteID,
						]);
					}
					$this->createRelationship([
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
				$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `relationship` = ? AND `order` = ?','calls',$data['status'])->fetchAll()->all()[0];
				$note = [
					'by' => $this->Auth->User['id'],
					'content' => $data['note'],
				];
				$noteID = $this->Auth->create('notes',$note);
				$call['output']['note']['raw'] = $this->Auth->read('notes',$noteID)->all()[0];
				$call['output']['note']['dom'] = $this->convertToDOM($call['output']['note']['raw']);
				$this->createRelationship([
					'relationship_1' => $request,
					'link_to_1' => $data['id'],
					'relationship_2' => 'notes',
					'link_to_2' => $noteID,
				]);
				$callRelationships = $this->getRelationships($request,$data['id']);
				foreach($callRelationships as $id => $relationships){
					foreach($relationships as $relationship){
						if($relationship['relationship'] == 'organizations'){
							$this->createRelationship([
								'relationship_1' => $relationship['relationship'],
								'link_to_1' => $relationship['link_to'],
								'relationship_2' => 'notes',
								'link_to_2' => $noteID,
							]);
							$this->createRelationship([
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
							$this->createRelationship([
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
			// Load Call
			var_dump($data);
			$get = parent::get('calls', $data);
			// Init Organization
			$API = new organizationsAPI;
			$organizations = [];
			$get['output']['organization'] = $API->get('organizations',['id' => $get['output']['this']['raw']['organization']]);
			// Load Contacts
			if(isset($get['success'],$get['output']['details']['contacts']['raw'])){
				foreach($get['output']['details']['contacts']['raw'] as $contact){
					$get['output']['details']['contacts']['subscriptions']['raw'][$contact['id']] = [];
					$get['output']['details']['contacts']['subscriptions']['dom'][$contact['id']] = [];
					$subscriptions = $this->Auth->query('SELECT * FROM `subscriptions` WHERE `relationship` = ? AND `link_to` = ?','users',$contact['id'])->fetchAll();
					if($subscriptions != null){
						$subscriptions = $subscriptions->all();
						foreach ($subscriptions as $subscription) {
							array_push($get['output']['details']['contacts']['subscriptions']['raw'][$contact['id']],$subscription);
							array_push($get['output']['details']['contacts']['subscriptions']['dom'][$contact['id']],$this->convertToDOM($subscription));
						}
					}
				}
			}
			// Load Users
			if(isset($get['success'],$get['output']['this']['raw']['assigned_to'])){
				if(!isset($get['output']['details']['users'])){ $get['output']['details']['users'] = ['dom' => [],'raw' => []]; }
				foreach(explode(";",trim($get['output']['this']['raw']['assigned_to'],";")) as $userID){
					if(!isset($get['output']['details']['users']['raw'][$userID])){
						$get['output']['details']['users']['raw'][$userID] = $this->Auth->read('users',$userID)->all()[0];
						$get['output']['details']['users']['dom'][$userID] = $this->convertToDOM($get['output']['details']['users']['raw'][$userID]);
					}
				}
			}
			// Load Statuses
			foreach(['issues','organizations','calls','containers'] as $statusType){
				foreach($this->Auth->read('statuses',$statusType,'relationship')->all() as $status){
					if(!isset($get['output']['details']['statuses']['raw'][$status['id']])){
						$get['output']['details']['statuses']['raw'][$status['id']] = $status;
						$get['output']['details']['statuses']['dom'][$status['id']] = $this->convertToDOM($get['output']['details']['statuses']['raw'][$status['id']]);
					}
				}
			}
			// Build Relations
			foreach($get['output']['relationships'] as $rid => $relations){
				foreach($relations as $uid => $relation){
					if(isset($get['output']['details'][$relation['relationship']]['dom'][$relation['link_to']])){
						$get['output']['relations'][$relation['relationship']][$relation['link_to']] = $get['output']['details'][$relation['relationship']]['dom'][$relation['link_to']];
						$get['output']['relations'][$relation['relationship']][$relation['link_to']]['owner'] = $relation['owner'];
						$get['output']['relations'][$relation['relationship']][$relation['link_to']]['created'] = $relation['created'];
						if(isset($relation['statuses'])){
							$get['output']['relations'][$relation['relationship']][$relation['link_to']]['status'] = $get['output']['details']['statuses']['dom'][$relation['statuses']]['order'];
						}
						if(!isset($get['output']['relations'][$relation['relationship']][$relation['link_to']]['name']) && isset($get['output']['relations'][$relation['relationship']][$relation['link_to']]['first_name'])){
							$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] = '';
							if($get['output']['relations'][$relation['relationship']][$relation['link_to']]['first_name'] != ''){
								if($get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] != ''){
									$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] .= ' ';
								}
								$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] .= $get['output']['relations'][$relation['relationship']][$relation['link_to']]['first_name'];
							}
							if($get['output']['relations'][$relation['relationship']][$relation['link_to']]['middle_name'] != ''){
								if($get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] != ''){
									$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] .= ' ';
								}
								$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] .= $get['output']['relations'][$relation['relationship']][$relation['link_to']]['middle_name'];
							}
							if($get['output']['relations'][$relation['relationship']][$relation['link_to']]['last_name'] != ''){
								if($get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] != ''){
									$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] .= ' ';
								}
								$get['output']['relations'][$relation['relationship']][$relation['link_to']]['name'] .= $get['output']['relations'][$relation['relationship']][$relation['link_to']]['last_name'];
							}
						}
					}
				}
			}
			return $get;
		}
	}

	public function create($request = null, $data = null){
		if(!is_array($data)){ $data = json_decode($data, true); }
		if(isset($data['relationship'],$data['link_to'])){
			if((isset($data['contact']))&&($data['contact'] != '')&&($data['contact'] != null)){
				$data['phone'] = $this->Auth->query('SELECT * FROM `contacts` WHERE `id` = ?',$data['contact'])->fetchAll()->all()[0]['phone'];
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
				$status = $this->Auth->query('SELECT * FROM `statuses` WHERE `relationship` = ? AND `order` = ?','calls',$data['status'])->fetchAll()->all()[0];
				$results['output']['relationship']['raw'] = $this->createRelationship([
					'relationship_1' => $data['relationship'],
					'link_to_1' => $data['link_to'],
					'relationship_2' => 'calls',
					'link_to_2' => $results['output']['raw']['id'],
					'relationship_3' => 'statuses',
					'link_to_3' => $status['id'],
				]);
				$results['output']['relationship']['dom'] = $this->convertToDOM($results['output']['relationship']['raw']);
				$this->createRelationship([
					'relationship_1' => 'calls',
					'link_to_1' => $results['output']['raw']['id'],
					'relationship_2' => 'statuses',
					'link_to_2' => $status['id'],
				]);
				$this->createRelationship([
					'relationship_1' => 'users',
					'link_to_1' => $results['output']['raw']['assigned_to'],
					'relationship_2' => 'calls',
					'link_to_2' => $results['output']['raw']['id'],
				]);
				$relationships = $this->getRelationships($data['relationship'],$data['link_to']);
				$status = [];
				$statuses = $this->Auth->read('statuses','issues','relationship');
				if($statuses != NULL){
					foreach($statuses->all() as $status){
						$status[$status['id']] = [
							'name' => $status['name'],
							'icon' => $status['icon'],
							'color' => $status['color'],
							'order' => $status['order'],
						];
					}
				}
				$issues = [];
				foreach($relationships as $relationship){
					foreach($relationship as $relation){
						if($relation['relationship'] == 'issues'){ $issues[$relation['link_to']] = $relation['statuses']; }
					}
				}
				foreach($issues as $issueID => $issueStatus){
					if(isset($status[$issueStatus]) && $status[$issueStatus]['order'] < 4){
						$this->createRelationship([
							'relationship_1' => 'issues',
							'link_to_1' => $issueID,
							'relationship_2' => 'calls',
							'link_to_2' => $results['output']['raw']['id'],
							'relationship_3' => 'statuses',
							'link_to_3' => $issueStatus,
						]);
					}
				}
				if((isset($results['output']['raw']['contact']))&&($results['output']['raw']['contact'] != '')&&($results['output']['raw']['contact'] != null)){
					$this->createRelationship([
						'relationship_1' => 'contacts',
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
