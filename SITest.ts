import * as SI from "./SteamInput";
import { rootCertificates } from "tls";

console.log("start validating action files");
let action_manifests : string[] = SI.findActionManifestFiles();

for (const filename of action_manifests)
{
    let rc : boolean = SI.validateActionManifestFile(filename);
    console.log(filename + ":" + rc);
}

console.log("done validating action files");




