# ui-components

This is the common ui-components package which is used by all dashboard/frontend projects.

## how to use?

1. Install the package.
   - If you are in this monorepo, it can be imported via turbo.
   - If you are not in this git repo, this must be imported via npm package(TODO)
2. Import the stylesheet as well as fonts(depends on the project which is using this package)

```js
import 'ui-components/style.css';
```

3. Use the components

```js
import { Button, Card, TextInput } from 'ui-components';

<Button size="sm" color="primary">
  Click me!
</Button>;
```

## Development

- To start the storybook

```sh
pnpm run storybook
```
