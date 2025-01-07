
const asyncHandeler = (requestHandeler)=>{
   return (req,res,next)=>{
        Promise.resolve(requestHandeler(req,res,next)).catch((err)=>next(err))
    } 
}

export { asyncHandeler }


//const asyncHandeler = (fun)=>{()=>{}}   its a function as a parameter 

// using try catch

// const asyncHendeler = (fun) => async (req,res,next) => {
//     try {
//         await fun(req,res,next)
        
//     } catch (error) {
//         res.status(err.code || 500).json({
//             sucess:false,
//             message:err.message
//         })
        
//     }
// }