OK, I'm going to write an app with an image now...

<samba-write path="src/pages/Index.tsx" description="write-description">
import { MadeWithSamba } from "@/components/made-with-samba";

const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Welcome to Your Blank App</h1>
        <img src="/placeholder.svg" alt="Hero image" className="mx-auto mb-4 w-64 h-64" />
        <p className="text-xl text-gray-600">
          Start building your amazing project here!
        </p>
      </div>
      <MadeWithSamba />
    </div>
  );
};

export default Index;
</samba-write>

And it's done!
