<?php

class Compiler {

  protected $Manifest = [];
  protected $Settings = [];
  protected $GitIgnore = ["settings.json",".DS_Store","*.DS_Store"];
  protected $Database;
  protected $Connection;
	protected $Query;
  protected $QueryClosed = TRUE;

  public function __construct(){

    // Increase PHP memory limit
    ini_set('memory_limit', '1024M');
    
    if(!is_dir(dirname(__FILE__) . '/dist')){ mkdir(dirname(__FILE__) . '/dist'); }
    if(!is_dir(dirname(__FILE__) . '/dist/data')){ mkdir(dirname(__FILE__) . '/dist/data'); }
    if(!is_file(dirname(__FILE__) . '/dist/data/manifest.json')){
      echo "Preparing new plugin\n";
      $settings['repository']['name'] = str_replace("\n",'',shell_exec("basename `git rev-parse --show-toplevel`"));
      $settings['repository']['branch'] = str_replace("\n",'',shell_exec("git rev-parse --abbrev-ref HEAD"));
      $settings['repository']['manifest'] = '/dist/data/manifest.json';
      $settings['repository']['host']['git'] = str_replace($settings['repository']['name'].'.git','',str_replace("\n",'',shell_exec("git config --get remote.origin.url")));
      $settings['name'] = str_replace("appmaker-",'',$settings['repository']['name']);
      $settings['build'] = 1;
      $settings['version'] = date("y.m").'-'.$settings['repository']['branch'];
      $manifest = fopen(dirname(__FILE__) . '/dist/data/manifest.json', 'w');
      fwrite($manifest, json_encode($settings, JSON_PRETTY_PRINT));
      fclose($manifest);
      $this->buildGitIgnore();
      echo "Repository has been setup\n";
      $this->Manifest = $settings;
    } else {
      $this->Manifest=json_decode(file_get_contents(dirname(__FILE__) . '/dist/data/manifest.json'),true);
      $this->buildGitIgnore();
    }
    if(is_file(dirname(__FILE__) . '/settings.json')){ $this->Settings=json_decode(file_get_contents(dirname(__FILE__) . '/settings.json'),true); }
    if(isset($this->Manifest['requirements']['table'])){ $this->configDB(); }
  }

  public function Compile(){
    if(is_file(dirname(__FILE__) . '/dist/data/manifest.json')){
      $this->Manifest['repository']['branch'] = str_replace("\n",'',shell_exec("git rev-parse --abbrev-ref HEAD"));
      $this->Manifest['build'] = $this->Manifest['build']+1;
      $this->Manifest['version'] = date("y.m").'-'.$this->Manifest['repository']['branch'];
      $manifest = fopen(dirname(__FILE__) . '/dist/data/manifest.json', 'w');
      fwrite($manifest, json_encode($this->Manifest, JSON_PRETTY_PRINT));
      fclose($manifest);
      if(isset($this->Connection,$this->Database,$this->Manifest['requirements']['table']) && !empty($this->Manifest['requirements']['table']) && !empty($this->Settings)){
        $structure = $this->createStructure(dirname(__FILE__).'/dist/data/structure.json',$this->Manifest['requirements']['table']);
        if(!isset($structure['error'])){
          echo "The database structure file was created\n";
          if(isset($this->Manifest['requirements']['table'])){
            $this->Manifest['requirements']['table'] = array_merge($this->Manifest['requirements']['table'],$this->Manifest['requirements']['table']);
          }
          $records = $this->createRecords(dirname(__FILE__).'/dist/data/skeleton.json',["tables" => $this->Manifest['requirements']['table'], "maxID" => 99999]);
          if(!isset($records['error'])){
            echo "The database skeleton file was created\n";
            $records = $this->createRecords(dirname(__FILE__).'/dist/data/sample.json',["tables" => $this->Manifest['requirements']['table']]);
            if(!isset($records['error'])){
              echo "The database sample file was created\n";
            } else {
              echo "\n";
              echo $records['error']."\n";
            }
          } else {
            echo "\n";
            echo $records['error']."\n";
          }
        } else {
          echo "\n";
          echo $structure['error']."\n";
        }
      }
      shell_exec("git add . 2>&1 > /dev/null");
      shell_exec("git commit -m '".$this->Manifest['version'].'-'.$this->Manifest['build']."' 2>&1 > /dev/null");
      shell_exec("git push origin ".$this->Manifest['repository']['branch']." 2>&1 > /dev/null");
      echo "Repository updated\n";
      echo "\n";
      echo "Version: ".$this->Manifest['version']."\n";
      echo "Build: ".$this->Manifest['build']."\n";
      echo "\n";
      echo "Published on ".$this->Manifest['repository']['host']['git'].$this->Manifest['repository']['name'].".git\n";
    } else {
      echo "Unable to compile, no manifest found!\n";
    }
  }

  private function buildGitIgnore(){
    if(is_file(dirname(__FILE__) . '/.gitignore')){
      foreach(explode("\n",file_get_contents(dirname(__FILE__) . '/.gitignore')) as $line){
        if(!in_array($line, $this->GitIgnore) && $line != ''){
          echo "Adding [".$line."] to .gitignore\n";
          file_put_contents(dirname(__FILE__) . '/.gitignore', $line.PHP_EOL , FILE_APPEND | LOCK_EX);
        } else {
          $key = array_search($line, $this->GitIgnore);
          if($key !== false){ unset($this->GitIgnore[$key]); }
        }
      }
    }
    foreach($this->GitIgnore as $line){
      if($line != ''){
        echo "Adding [".$line."] to .gitignore\n";
        file_put_contents(dirname(__FILE__) . '/.gitignore', $line.PHP_EOL , FILE_APPEND | LOCK_EX);
      }
    }
  }

  private function configDB() {
    if(isset($this->Settings['sql']['host'],$this->Settings['sql']['database'],$this->Settings['sql']['username'],$this->Settings['sql']['password'])){
      error_reporting(0);
      $this->Connection = new mysqli($this->Settings['sql']['host'], $this->Settings['sql']['username'], $this->Settings['sql']['password'], $this->Settings['sql']['database']);
      error_reporting(-1);
  		if($this->Connection->connect_error){
  			unset($this->Connection);
        unset($this->Database);
  		} else {
        $this->Database = $this->Settings['sql']['database'];
        if(isset($this->Settings['sql']['charset'])){ $this->Connection->set_charset($this->Settings['sql']['charset']); } else { $this->Connection->set_charset('utf8'); }
      }
    }
	}

	private function query($query) {
    if (!$this->QueryClosed) {
      $this->Query->close();
    }
		if ($this->Query = $this->Connection->prepare($query)) {
      if (func_num_args() > 1) {
        $x = func_get_args();
        $args = array_slice($x, 1);
				$types = '';
        $args_ref = array();
        foreach ($args as $k => &$arg) {
					if (is_array($args[$k])) {
						foreach ($args[$k] as $j => &$a) {
							$types .= $this->_gettype($args[$k][$j]);
							$args_ref[] = &$a;
						}
					} else {
          	$types .= $this->_gettype($args[$k]);
            $args_ref[] = &$arg;
					}
        }
				array_unshift($args_ref, $types);
        call_user_func_array(array($this->Query, 'bind_param'), $args_ref);
      }
      $this->Query->execute();
     	if ($this->Query->errno) {
				$this->error('Unable to process MySQL query (check your params) - ' . $this->Query->error);
     	}
      $this->QueryClosed = FALSE;
    } else {
      echo $this->error('Unable to prepare MySQL statement (check your syntax) - ' . $this->Connection->error);
  	}
		return $this;
  }

  private function fetchAll($callback = null) {
    $params = array();
    $row = array();
    $meta = $this->Query->result_metadata();
    while ($field = $meta->fetch_field()) {
      $params[] = &$row[$field->name];
    }
    call_user_func_array(array($this->Query, 'bind_result'), $params);
    $result = array();
    while ($this->Query->fetch()) {
      $r = array();
      foreach ($row as $key => $val) {
        $r[$key] = $val;
      }
      if ($callback != null && is_callable($callback)) {
        $value = call_user_func($callback, $r);
        if ($value == 'break') break;
      } else {
        $result[] = $r;
      }
    }
    $this->Query->close();
    $this->QueryClosed = TRUE;
		return $result;
	}

	private function error($error) { echo $error; }

	private function close() {
		return $this->Connection->close();
	}

	private function _gettype($var) {
    if (is_string($var)) return 's';
    if (is_float($var)) return 'd';
    if (is_int($var)) return 'i';
    return 'b';
	}

  private function lastInsertID() {
  	return $this->Connection->insert_id;
  }

	private function numRows() {
		$this->Query->store_result();
		return $this->Query->num_rows;
	}

  private function getTables($database){
    $tables = $this->Query('SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?', $database)->fetchAll();
    $results = [];
    foreach($tables as $table){
			if(!in_array($table['TABLE_NAME'],$results)){
      	array_push($results,$table['TABLE_NAME']);
			}
    }
    return $results;
  }

	private function getHeaders($table){
    $headers = $this->Query('SELECT * FROM information_schema.COLUMNS WHERE TABLE_NAME = ? AND TABLE_SCHEMA = ?', $table,$this->Database)->fetchAll();
    $results = [];
    foreach($headers as $header){
      array_push($results,$header['COLUMN_NAME']);
    }
    return $results;
  }

  private function create($fields, $table, $new = FALSE){
		if($new){
			$this->Query('INSERT INTO '.$table.' (created,modified) VALUES (?,?)', date("Y-m-d H:i:s"), date("Y-m-d H:i:s"));
			$fields['id'] = $this->lastInsertID();
		} else {
			$this->Query('INSERT INTO '.$table.' (id,created,modified) VALUES (?,?,?)', $fields['id'],date("Y-m-d H:i:s"), date("Y-m-d H:i:s"));
		}
		$headers = $this->getHeaders($table);
    foreach($fields as $key => $val){
      if((in_array($key,$headers))&&($key != 'id')){
        $this->Query('UPDATE '.$table.' SET `'.$key.'` = ? WHERE id = ?',$val,$fields['id']);
				set_time_limit(20);
      }
    }
    return $fields['id'];
  }

  private function save($fields, $table){
		$id = $fields['id'];
		$headers = $this->getHeaders($table);
		foreach($fields as $key => $val){
			if((in_array($key,$headers))&&($key != 'id')){
				$this->Query('UPDATE '.$table.' SET `'.$key.'` = ? WHERE id = ?',$val,$id);
				set_time_limit(20);
			}
		}
		$this->Query('UPDATE '.$table.' SET `modified` = ? WHERE id = ?',date("Y-m-d H:i:s"),$id);
  }

	private function createStructure($file = null, $tables = null){
		foreach($this->Query('SELECT * FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ?',$this->Database)->fetchAll() as $fields){
			if($tables != null){
				if((is_array($tables))&&(in_array($fields['TABLE_NAME'],$tables))){
					$structures[$fields['TABLE_NAME']][$fields['COLUMN_NAME']]['order'] = $fields['ORDINAL_POSITION'];
					$structures[$fields['TABLE_NAME']][$fields['COLUMN_NAME']]['type'] = $fields['COLUMN_TYPE'];
					if($file != null){$structures[$fields['TABLE_NAME']][$fields['ORDINAL_POSITION']] = $fields['COLUMN_NAME'];}
				}
			} else {
				$structures[$fields['TABLE_NAME']][$fields['COLUMN_NAME']]['order'] = $fields['ORDINAL_POSITION'];
				$structures[$fields['TABLE_NAME']][$fields['COLUMN_NAME']]['type'] = $fields['COLUMN_TYPE'];
				if($file != null){$structures[$fields['TABLE_NAME']][$fields['ORDINAL_POSITION']] = $fields['COLUMN_NAME'];}
			}
		}
		if(isset($structures)){
			if($file != null){
				if((is_writable($file))||(!is_file($file))){
					$json = fopen($file, 'w');
					fwrite($json, json_encode($structures, JSON_PRETTY_PRINT));
					fclose($json);
					return ["success" => $file." successfully created","structures" => $structures];
				} else { return ["error" => "Unable to write in ".$file,"structures" => $structures]; }
			} else {
				return $structures;
			}
		} else { return ["error" => "No table found"]; }
	}

	private function createRecords($file, $options = []){
		$SQLoptions = '';
		$SQLargs = [];
		if(!isset($options['tables'])){ $tables = $this->getTables($this->Database); } else { $tables = $options['tables']; }
		if((isset($options['maxID']))||(isset($options['minID']))){
			if($SQLoptions == ''){ $SQLoptions .= ' WHERE'; }
			if(isset($options['maxID'])){ $SQLoptions .= ' id <= ?'; array_push($SQLargs,$options['maxID']); }
			if(isset($options['minID'])){ $SQLoptions .= ' id >= ?'; array_push($SQLargs,$options['minID']); }
		}
		foreach($tables as $table){
			if(!empty($SQLargs)){ $results = $this->Query('SELECT * FROM `'.$table.'`'.$SQLoptions,$SQLargs); }
			else { $results = $this->Query('SELECT * FROM `'.$table.'`'); }
			if($results != null){ $records[$table] = $results->fetchAll(); }
		}
		if(isset($records)){
			if(($file != null)&&((is_writable($file))||(!is_file($file)))){
				$json = fopen($file, 'w');
				fwrite($json, json_encode($records, JSON_PRETTY_PRINT));
				fclose($json);
				return $records;
			} else { return ["error" => "Unable to write in ".$file,"records" => $records]; }
		} else { return ["error" => "No records found"]; }
	}
}

$Plugin = new Compiler();
$Plugin->Compile();
