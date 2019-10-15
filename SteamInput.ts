import * as fs from "fs";
import * as path from "path";
import { windef, Key } from "windows-registry";
function lookup_registry_string(keyname : string) : string
{
    var f = 'SOFTWARE\\Wow6432Node\\Valve\\Steam';
    const key1 = new Key(windef.HKEY.HKEY_LOCAL_MACHINE, '', windef.KEY_ACCESS.KEY_READ);
    const key2 = key1.openSubKey(f, windef.KEY_ACCESS.KEY_READ);
    const value = key2.getValue(keyname);
    key2.close();
    key1.close();
    return value;
}

function lookup_steam_apps_path() : string
{
    var steam_install_path = lookup_registry_string("InstallPath");
    return path.join(steam_install_path, "steamapps", "common");
}

// find all action files by searching down the install path for all
// json files.
function findJSONFiles(dir, filelist) {
    var path = path || require('path');
    var fs = fs || require('fs'),
        files = fs.readdirSync(dir);
    filelist = filelist || [];
    files.forEach(function(file) {
      if (fs.statSync(path.join(dir, file)).isDirectory()) {
        filelist = findJSONFiles(path.join(dir, file), filelist);
      }
      else {
          if (file.indexOf('.json') == file.length - 5)
          {
              filelist.push(path.join(dir, file).replace(/\\/g,"/"));
          }
      }  });
    return filelist;
  };


function load_file_as_json(fn)
{
    var contents = fs.readFileSync(fn);
    var jsonobj = JSON.parse(contents.toString());
    return jsonobj;
}

function is_action_file(fn)
{
  try{
    var jsonobj = load_file_as_json(fn);
    var action = jsonobj["actions"];
    if (Array.isArray(action))
    {
      return true;
    }
  } catch (e)
  {
    console.log(e);
  }
  return false;
}

function look_for_action_files(json_file_names)
{
  var action_files = json_file_names.filter(is_action_file);
  return action_files;
}

export function findActionFiles() : string[]
{
    var steam_apps_path = lookup_steam_apps_path();
    var json_files = findJSONFiles(steam_apps_path, null);
    var action_files = look_for_action_files(json_files);
    return action_files;
    
}  


function verify_action_path(path, action_set_names)
{
  var [prefix, action_string, action_set, io, name] = path.split('/');
  // should start with //actions
  
  if (action_string != "actions") {
    throw("unexpected: " + action_string + " expected: actions");
  }
  if (!action_set_names.includes(action_set))
  {
    throw("invalid action set " + action_set);
  }
  if (!["in","out"].includes(io))
  {
    throw("unexpected io direction"+ io);
  }
  if (name.length == 0)
  {
    throw("name is too short");
  }
}

// actions have a usage parameter
function verify_action_set_usage(u)
{
  if (!["single", "leftright", "hidden"].includes(u)) {
    throw("unexpected usage: " + u);  
  }
}

function verify_action_type(t)
{
  if (!["boolean", "vector1", "vector2", "vector3", "vibration", "pose", "skeleton"].includes(t))
  {
    throw("unexpected action type: " + t);
  }
}
function validate_action(action_obj, action_set_names)
{

  verify_action_path(action_obj.name, action_set_names);
  verify_action_type(action_obj.type);
}

function validate_action_manifest_file(action_file_name)
{
  var manifest = load_file_as_json(action_file_name);
  // make sure it has at least one action
  if (manifest.actions.length < 1)
  { 
    throw("empty actions");
  }
  
  var action_sets = manifest.action_sets;
  var action_set_names = action_sets.map(action_set => action_set.name.match('\/actions\/(.*)')[1]);
  for (const action of manifest.actions)
  {
    validate_action(action, action_set_names);
  }
}

// walk through each file and print out
// any files that don't appear to be valid
export function validateActionManifestFiles(action_file_names : Array<string>)
{
  for (const fn of action_file_names)
  {
    try {
      validate_action_manifest_file(fn);
    }
    catch(e)
    {
      console.log(fn);
      console.log(e);
    }
  } 
}
  
  