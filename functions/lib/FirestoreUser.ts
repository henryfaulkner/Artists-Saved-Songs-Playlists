import IFirebaseDocument from "./IFirebaseDocument";

class FirestoreUser implements IFirebaseDocument {
  public DocumentID: string;
  public UserID: string;
  public name: string;
  public refresh_token: string;

  public constructor(json) {
    if (json["DocumentID"]) this.DocumentID = json["DocumentID"];
    if (json["UserID"]) this.UserID = json["UserID"];
    if (json["name"]) this.name = json["name"];
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
