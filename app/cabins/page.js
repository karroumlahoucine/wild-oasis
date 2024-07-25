import Counter from "../components/Counter";

async function Page() {
  const res = await fetch("https://jsonplaceholder.typicode.com/users");
  const data = await res.json();
  return (
    <>
      <h1>Cabins page</h1>
      {data.map((item) => (
        <p key={item.id}>{item.username}</p>
      ))}
      <Counter />
    </>
  );
}

export default Page;
