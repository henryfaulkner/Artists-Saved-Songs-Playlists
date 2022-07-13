import IFirebaseDocument from "./IFirebaseDocument";

class FirestoreUser implements IFirebaseDocument {
  public DocumentID: string;
  public AuthID: string;
  public SpotifyUserID: string;
  public name: string;
  public Email: string;
  public refresh_token: string;

  public constructor(json) {
    if (json["DocumentID"]) this.DocumentID = json["DocumentID"];
    if (json["AuthID"]) this.AuthID = json["AuthID"];
    if (json["SpotifyUserID"]) this.SpotifyUserID = json["SpotifyUserID"];
    if (json["name"]) this.name = json["name"];
    if (json["Email"]) this.Email = json["Email"];
    if (json["refresh_token"]) this.refresh_token = json["refresh_token"];
  }

  get GetDocumentID(): string {
    return this.DocumentID;
  }

  set SetDocumentID(DocumentID: string) {
    this.DocumentID = DocumentID;
  }
}

export default FirestoreUser;
