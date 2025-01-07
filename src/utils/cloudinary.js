import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

 //Configuration
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECREt 
    });

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath) return null
        //upload file on cloudinery
        const responce = await cloudinary.uploader.upload(localFilePath,{
            resource_type:"auto"
        })

        //file has uploded
        console.log("file is uploded",responce.url);
        fs.unlinkSync(localFilePath)
        return responce;
        
    } catch (error) {
        fs.unlinkSync(localFilePath) //remove the locally saved temporary file as the upload operation got failed 
        return null;
    }
}

export { uploadOnCloudinary }
