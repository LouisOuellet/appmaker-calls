<?php
if(!is_dir(dirname(__FILE__) . '/dist')){ mkdir(dirname(__FILE__) . '/dist'); }
if(!is_dir(dirname(__FILE__) . '/dist/data')){ mkdir(dirname(__FILE__) . '/dist/data'); }
if(is_file(dirname(__FILE__) . '/dist/data/manifest.json')){
  $settings=json_decode(file_get_contents(dirname(__FILE__) . '/dist/data/manifest.json'),true);
  $settings['build'] = $settings['build']+1;
  $settings['version'] = date("y.m").'-'.$settings['repository']['branch'];
  $manifest = fopen(dirname(__FILE__) . '/dist/data/manifest.json', 'w');
  fwrite($manifest, json_encode($settings, JSON_PRETTY_PRINT));
  fclose($manifest);
} else {
  echo "Preparing new plugin\n";
  $settings['repository']['name'] = str_replace("\n",'',shell_exec("basename `git rev-parse --show-toplevel`"));
  $settings['repository']['branch'] = str_replace("\n",'',shell_exec("git rev-parse --abbrev-ref HEAD"));
  $settings['repository']['manifest'] = '/dist/data/manifest.json';
  $settings['repository']['host']['git'] = str_replace($settings['repository']['name'].'.git','',str_replace("\n",'',shell_exec("git config --get remote.origin.url")));
  $settings['name'] = str_replace("appmaker-",'',$settings['repository']['name']);
  $settings['status'] = false;
  $settings['build'] = 1;
  $settings['version'] = date("y.m").'-'.$settings['repository']['branch'];
  $manifest = fopen(dirname(__FILE__) . '/dist/data/manifest.json', 'w');
  fwrite($manifest, json_encode($settings, JSON_PRETTY_PRINT));
  fclose($manifest);
  $gitignore = fopen(dirname(__FILE__) . '/.gitignore', 'w');
  fwrite($gitignore, ".DS_Store\n*.DS_Store\n");
  fclose($gitignore);
  echo "Repository has been setup\n";
}
shell_exec("git add . && git commit -m 'UPDATE' && git push origin ".$settings['repository']['branch']);
echo "\n";
echo "Version: ".$settings['version']."\n";
echo "Build: ".$settings['build']."\n";
echo "\n";
echo "Published on ".$settings['repository']['host']['git'].$settings['repository']['name'].".git\n";
