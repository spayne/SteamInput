import * as SI from "./SteamInput";
import * as _ from "lodash";

function test_action_file_validation()
{
    console.log("start validating action files");
    let action_manifests : string[] = SI.findActionManifestFiles();
    
    for (const filename of action_manifests)
    {
        let rc : boolean = SI.validateActionManifestFile(filename);
        console.log(filename + ":" + rc);
    }
    
    console.log("done validating action files");
    
}

// test creating action file
function test_creating_valid_action_file()
{
    let a1 = new SI.ActionManifest();
    a1.addAction("/actions/main/in/OpenInventory", "mandatory", "boolean");
    a1.addDefaultBinding("some_controller", "mygame_bindings_some_controller.json");
    a1.addActionSet("/actions/main", "leftright");
    a1.addLocalizationEntry("en_us", "foo", "bar");
    a1.addLocalizationEntry("en_us", "foo1", "bar1");
    var filename = "./a1-actions.json";
    a1.writeJSONfile(filename);
    a1.validate();    

    let a2 = SI.ActionManifest.loadJSONfile(filename);
    console.log(_.isEqual(a1,a2));
}

function test_creating_invalid_action_file()
{
    let a1 = new SI.ActionManifest();
    // add an action, without adding the action set
    a1.addAction("/actions/main/in/OpenInventory", "mandatory", "boolean");
    try {
        a1.validate();
    }
    catch (e)
    {
        console.log(e);
    }      
}

function test_creating_invalid_action_file_1()
{
    let a1 = new SI.ActionManifest();
    // add an action, with empty name
    a1.addActionSet("/actions/main", "leftright");
    a1.addAction("/actions/main/in/", "mandatory", "boolean");
    try {
        a1.validate();
    }
    catch (e)
    {
        console.log(e);
    }      
}

test_action_file_validation();
test_creating_valid_action_file();
test_creating_invalid_action_file();
test_creating_invalid_action_file_1();




