import * as fs from "fs";
import * as path from "path";
import { windef, Key } from "windows-registry";

class Action {
  public name : string;
  public requirement : string;
  public type: string;
}

class DefaultBinding {
  public controller_type: string;
  public binding_url : string
}

class ActionSet {
  public name : string;
  public usage : string;
}

export class ActionManifest {
  actions : Action[] = [];
  default_bindings : DefaultBinding[] = [];
  action_sets : ActionSet[] = [];

  // an array of objects/
  //@jsonArrayMember(any)
  localization : any[] = [];

  constructor() {    
  }
  
  addAction(name : string, requirement : string, type : string) {
   this.actions.push({name,requirement,type}); 
  }
  addDefaultBinding(controller_type : string, binding_url : string)
  {
    this.default_bindings.push({controller_type, binding_url});
  }
  addActionSet(name : string, usage: string)
  {
    this.action_sets.push({name, usage});
  }

  // search through the localization array and return the index
  // of the entry corresponding to the tag.  return -1 if not found
  findIndexForLocalizationTag(language_tag : string) : number
  {
    let index : number = -1;
    for(let i=0; i<this.localization.length; i++)
    { 
      if (this.localization[i].language_tag == language_tag)
      {
        return i;
      }
    }
    return index;
  }

  addLocalizationEntry(language_tag: string, key: string, value: string)
  {
    // find the bucket for this language_tag
    let index : number = this.findIndexForLocalizationTag(language_tag);
    if (index == -1)
    {
      var dict = {};
      dict['language_tag'] = language_tag;
      this.localization.push(dict);
      index = this.localization.length-1;
    } 
    // push the key and value
    this.localization[index][key] = value;
  }

  writeJSONfile(filename : string)
  {
    fs.writeFileSync(filename, JSON.stringify(this,null, 4));
  }

  // todo: see if there is a way to load a json file into
  // an existing instance.
  static loadJSONfile(filename : string) : ActionManifest
  {
    let contents : Buffer = fs.readFileSync(filename);
    let manifest : ActionManifest;

    var jsonobj = JSON.parse(contents.toString());
    manifest = new ActionManifest;
    manifest.action_sets = jsonobj.action_sets;
    manifest.actions = jsonobj.actions;
    manifest.default_bindings = jsonobj.default_bindings;
    manifest.localization = jsonobj.localization;
    return manifest;
  }

  validate()
  {
    var action_sets = this.action_sets;
    var action_set_names = action_sets.map(action_set => action_set.name.match('\/actions\/(.*)')[1]);
    for (const action of this.actions)
    {
      validate_action(action, action_set_names);
    }
  }
}


function lookup_steam_registry_string(keyname : string) : string
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
    let steam_install_path : string = lookup_steam_registry_string("InstallPath");
    return path.join(steam_install_path, "steamapps", "common");
}

// find all action files by searching down the install path for all
// json files.
function findJSONFiles(dir, filelist) {
    var files = fs.readdirSync(dir);
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

export function findActionManifestFiles() : string[]
{
    var steam_apps_path = lookup_steam_apps_path();
    var json_files = findJSONFiles(steam_apps_path, null);
    var action_files = look_for_action_files(json_files);
    return action_files;    
}  

function verify_action_path(path : string, action_set_names : string[])
{
  var [prefix, action_string, action_set, io, name] = path.split('/');
  // should start with //actions
  
  if (action_string != "actions") {
    throw("ERROR unexpected: " + action_string + " expected: actions");
  }
  if (!action_set_names.includes(action_set))
  {
    throw("ERROR unknown action set '" + action_set + "' in action path: " + path);
  }
  if (!["in","out"].includes(io))
  {
    throw("ERROR unexpected io direction: " + io + "' in action path: " + path);
  }
  if (name.length == 0)
  {
    throw("ERROR action name is too short in action path: " + path);
  }
}

// actions have a usage parameter
function verify_action_set_usage(u : string)
{
  if (!["single", "leftright", "hidden"].includes(u)) {
    throw("ERROR unexpected usage: " + u);  
  }
}

function verify_action_type(t : string)
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

export function validateActionManifestFile(action_file_name : string) : boolean
{
  let rc : boolean = true;
  try {
    let manifest : ActionManifest;
    manifest = ActionManifest.loadJSONfile(action_file_name);
    manifest.validate();
  } catch (e)
  {
    rc = false;
  }
  return rc;
}