import PostForm from "../PostForm";
import { createPostAction } from "../actions";

export default function NewPostPage() {
  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Новая статья</h1>
      <PostForm action={createPostAction} submitLabel="Опубликовать" />
    </>
  );
}
