import { Router } from "express";
import { searchPosts, searchUsers } from "../controllers/search.controller";



const searchRouter = Router()

searchRouter.get("/users", searchUsers);
searchRouter.get("/posts", searchPosts);
export default searchRouter