const mongoose = require('mongoose');

const connectDB = async() =>{
        try {
         await mongoose.connect(process.env.MONGO_URI)
        }catch(error){
           console.log('connection error');
           
        }

        const connection = mongoose.connection;
        if(connection.readyState>=1){
            console.log('connected to db');
            return;            
        }
        connection.on("error",()=> console.log("connection failed")
        );
}

module.exports = {connectDB}
