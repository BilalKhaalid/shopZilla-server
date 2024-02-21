import mongoose from "mongoose";

// Connect MongoDB at default port 27017.
function connectToDB(uri: string) {
  mongoose
    .connect(uri)
    .then((connect) => {
      console.log(`Connected to DB ${connect.connection.host}`);
    })
    .catch((error) => {
      console.log(`Error connecting to DB ${error}`);
    });
}

export default connectToDB;
