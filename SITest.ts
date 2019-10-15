import * as SI from "./SteamInput";

console.log("start validating action files");
let action_manifests : string[] = SI.findActionFiles();
SI.validateActionManifestFiles(action_manifests);
console.log("done validating action files");




