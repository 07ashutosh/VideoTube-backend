import { asyncHandeler } from "../utils/asyncHandler.js";

import { ApiError } from "../utils/ApiError.js"

import { User } from "../models/user.modle.js";

import { uploadOnCloudinary } from "../utils/cloudinary.js";

import { ApiResponce } from "../utils/ApiResponce.js";

import jwt from "jsonwebtoken";
import mongoose from "mongoose";


// method to create access and refresh token
const generateAccessAndRefreshToken = async (userId) => {
    try {
        //console.log(userId);

        const user = await User.findById(userId)
        //console.log(user);

        const accessToken = user.generateAccessToken()
        //console.log(accessToken);

        const refreshToken = user.generateRefreshToken()

        //saving refresh token into database
        user.refreshToken = refreshToken
        await user.save({ validateBeforeSave: false })

        return { accessToken, refreshToken }
    } catch (error) {
        throw new ApiError(500, "somthing went wrong while generating refresh and access token")
    }
}


const regesterUser = asyncHandeler(async (req, res) => {
    //getting user information
    //valadition
    //check if email is present or not in database(if present so throw an error user alrady exist)
    //check for images,check for avatat
    //upload to cloudinary,avatar
    //create user object - creat entry in db
    //remove password and refresh token from response
    //check for user creation
    //return res


    //getting user information from the req.body it dose not include files such as avatar or cover image
    const { fullName, email, username, password } = req.body
    

    // appling validation 
    if ([fullName, email, username, password].some((field) => field?.trim() === ""))
    //some(requires call back) is applied on the array which checks every elements(or field) in the array if any element is emtpty it throws the error
    {
        throw new ApiError(400, "all fields are required")
    }

    //checking user alredy exist or not 
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    //if user exist throws an error
    if (existedUser) {
        throw new ApiError(409, "user with email or user name alredy exist");
    }

    //    req.files was the function given by the middleware 
    //?.avatar[0] provide the path of the file and then using .path we access the path
    //console.log(req.files)
    const avatarLocalPath = req.files?.avatar[0]?.path;
    // console.log("req.file",req.file);
    
    //const coverImageLocalPath = req.files?.coverImage[0].path;

    let coverImageLocalPath;
    if (res.files && Array.isArray(res.files.coverImage) && res.files.coverImage.length > 0) {
        coverImageLocalPath = res.files.coverImage[0].path
    }

    // checking avatar is present or not
    if (!avatarLocalPath) {
        throw new ApiError(400, "avatar is required")
    }

    //uploading avatat and coverimage on cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)


    if (!avatar) {
        throw new ApiError(400, "avatar is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()

    })

    //console.log(req.files);


    // if user not created throw an error
    if (!user) {
        throw new ApiError(403, "user Not created")
    }
    //remove password and refresh token from the user detail before showing data to the user
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    // const ceratedUser = await User.findById(user._id).selected(
    //     "-password -refreshToken"
    // )

    // if (!ceratedUser) {
    //     throw new ApiError(500,"somthing went wrong while registration the user")
    // }

    return res.status(201).json(
        new ApiResponce(200, createdUser, "user regestered successfully")
    )


})

const loginUser = asyncHandeler(async (req, res) => {
    //get data from req.body
    // email or username
    //find the user
    //password check
    //access and refresh token
    //send cookie

    //geting data from form or body
    const { email, username, password } = req.body

    //validating username or email is qiven or not
    if (!(username || email)) {
        throw new ApiError(400, "username or email is required")
    }
    //finding data from the database
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })

    //validating data comming from the database
    if (!user) {
        throw new ApiError(404, "user does not exist")
    }
    //validating password using method isPasswordCorrect from user.model.js
    const isPasswordVaild = await user.isPasswordCorrect(password)

    //password checking
    if (!isPasswordVaild) {
        throw new ApiError(401, "invalid credentials")
    }

    //as similar as req.body accessing access and refresh token from the method and passing id 
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id)

    //now we have loggedin user without password and refresh token field
    const loggedInUser = await User.findById(user._id)
        .select("-password -refreshToken")

    //send cookies option
    const option = {
        httpOnly: true,
        secure: true
    }
    //seting cookies 
    return res
        .status(200)
        .cookie("accessToken", accessToken, option)
        .cookie("refreshToken", refreshToken, option)
        .json(
            new ApiResponce(
                200,
                {
                    user: loggedInUser, accessToken, refreshToken
                },
                "User logged In Successfully"
            )
        )

})

const logoutUser = asyncHandeler(async (req, res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {
                refreshToken: 1
            }

        },
        {
            new: true
        }
    )

    const option = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
        .clearCookie("accessToken", option)
        .clearCookie("refreshToken", option)
        .json(new ApiResponce(200, {}, "user logged out"))
})

//generating new access and refresh token for login again 
const refreshAccessToken = asyncHandeler(async (req, res) => {
    const incomingRefreshToken = req.cookies.ref || req.body.refreshToken
    console.log("incomingRefreshToken :", incomingRefreshToken);


    if (!incomingRefreshToken) {
        throw new ApiError(401, "unauthrized request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)

        const user = User.findById(decodedToken?._id)
        if (!user) {
            throw new ApiError(401, "invalid refresh token")
        }
        if (incomingRefreshToken !== user?.refreshToken) {
            throw new ApiError(401, "refresh token is expired or used")
        }
        const option = {
            httpOnly: true,
            secure: true
        }
        const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id)

        return res
            .status(200)
            .cookie("accessToken", accessToken, option)
            .cookie("refreshToken", newrefreshToken, option)
            .json(
                new ApiResponce(
                    200,
                    {
                        accessToken, newrefreshToken
                    },
                    "Access token refreshed sucessfully"
                )
            )
    } catch (error) {
        throw new ApiError(401, error?.message || "invalid refresh token")
    }
})

//changing current password
const changeCurrentPassword = asyncHandeler(async (req, res) => {
    const { oldPassword, newPassword } = req.body
    const user = await User.findById(req.user?._id)
    console.log("user:", user);


    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400, "Invalid old password")
    }

    user.password = newPassword
    await user.save({ validateBeforeSave: false })

    return res
        .status(200)
        .json(
            new ApiResponce(200, {}, "password changed sucessfully")
        )

})

//getting current user
const getCurrentUser = asyncHandeler(async (req, res) => {
    return res
        .status(200)
        .json(new ApiResponce(200, req.user, "current user fetched sucessfully"))
})

//updating user details
const updateAccountDetail = asyncHandeler(async (req, res) => {
    const { fullName, email } = req.body
    if (!(fullName || email)) {
        throw new ApiError(400, "all fields are required")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullName,
                email: email
            }
        },
        { new: true }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponce(200, user, "account details updated sucessfully"))
})

//file update avatar
const updateUserAvatar = asyncHandeler(async (req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        new ApiError(400, "avatar is missing")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        new ApiError(400, "Error while uploading on avatar")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        }, {
        new: true
    }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponce(200, avatar, "avatar image updated sucessfully"))

})

//file update cover image
const updateUsercoverImage = asyncHandeler(async (req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        new ApiError(400, "cover image file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        new ApiError(400, "Error while uploading on cover image")
    }

    await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        }, {
        new: true
    }
    ).select("-password")

    return res
        .status(200)
        .json(new ApiResponce(200, user, "cover image updated sucessfully"))

})


// aggregration pipeline
const getUserChannelProfile = asyncHandeler(async (req, res) => {


    const { username } = req.params

    console.log("username :" , username);
    

    if (!username?.trim()) {
        throw new ApiError(400, "username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: {
                    $size: "$subscribers"
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                username: 1,
                subscribersCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1

            }
        }
    ])

    console.log("channel :",channel);
    

    if (!channel?.length) {
        throw new ApiError(404, "channel does not exists")
    }

    return res
    .status(200)
    .json(
        new ApiResponce(200, channel[0], "User channel fetched successfully")
    )
    // const { username } = req.params

    // if (!username?.trim()) {
    //     throw new ApiError(200, "user name is missing")
    // }

    // const channel = await User.aggregate([
    //     //match pipeline
    //     {
    //         $match: {
    //             username: username?.toLowerCase()
    //         }
    //     },
    //     // no fo subscriber pipeline
    //     {
    //         $lookup: {
    //             from: "subscriptions",
    //             localField: "_id",
    //             foreignField: "channel",
    //             as: "subscribers"
    //         }
    //     },
    //     // no of subscribed channels by me
    //     {
    //         $lookup: {
    //             from: "subscriptions",
    //             localField: "_id",
    //             foreignField: "subscriber",
    //             as: "subscribedTo"
    //         }
    //     },
    //     //add filed in user model subscriber count , subscribed count , is subscribed or not (for button subscribe or subscribed)
    //     {
    //         $addFields: {
    //             subscriberCount: {
    //                 $size: "$subscribers"
    //             },
    //             subscribedToCount: {
    //                 $size: "$subscribedTo"
    //             },
    //             isSubscribed: {
    //                 $cond: {
    //                     if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // Make sure to use proper field path
    //                     then: true,
    //                     else: false
    //                 }
    //             }
    //         }
    //     },

    //     //project, what we want to send 
    //     {
    //         $project: {
    //             fullName: 1,
    //             username: 1,
    //             subscriberCount: 1,
    //             subscribedToCount: 1,
    //             isSubscribed: 1,
    //             avatar: 1,
    //             coverImage: 1,
    //             email: 1
    //         }
    //     }
    // ]);

    // console.log("channel :", channel );

    // if (!channel?.length) {
    //     throw new ApiError(404, "channel does not exist")
    // }

    // return res
    //     .status(200)
    //     .json(
    //         new ApiResponce(200, channel[0], "User channel fetched sucessfullt")
    //     )

})

const getUserWatchHistory = asyncHandeler(async (req, res) => {
    const user = await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "user",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
        .status(200)
        .json(
            200,
            user[0].watchHistory,
            "watch history fetched sucessfully"
        )
})

export {
    regesterUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetail,
    updateUserAvatar,
    updateUsercoverImage,
    getUserChannelProfile,
    getUserWatchHistory
}
