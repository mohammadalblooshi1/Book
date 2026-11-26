// Usage: npm run samples          (add / refresh sample listings)
//        npm run samples -- remove
import { removeSamples, seedSamples } from "@/lib/samples";

const remove = process.argv[2] === "remove";
(remove ? removeSamples().then(() => "Sample listings removed.") : seedSamples().then((n) => `Added ${n} sample listings.`))
  .then((msg) => console.log(msg))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
