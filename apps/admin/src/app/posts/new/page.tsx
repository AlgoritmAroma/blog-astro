import PostForm from "../PostForm";
import { createPostAction } from "../actions";
import { getCategories } from "@/lib/categories";

export default async function NewPostPage() {
  const categories = await getCategories();

  return (
    <>
      <h1 style={{ marginBottom: 20 }}>Новая статья</h1>
      <PostForm
        action={createPostAction}
        submitLabel="Опубликовать"
        categories={categories.map((category) => category.name)}
        draftKey="new"
      />
    </>
  );
}
