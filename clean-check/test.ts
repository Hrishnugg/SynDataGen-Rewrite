// A simple TypeScript file to test that our TypeScript setup works
interface User {
  id: string;
  name: string;
  email: string;
}

function createUser(name: string, email: string): User {
  return {
    id: Math.random().toString(36).substring(2, 9),
    name,
    email
  };
}

const user = createUser("John Doe", "john@example.com");
console.log(user);

export type { User };
export { createUser }; 