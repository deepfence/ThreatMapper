import { Button } from '@react-email/button';
import { Html } from '@react-email/html';
import { Tailwind } from '@react-email/tailwind';
import { Head } from '@react-email/head';
import { Preview } from '@react-email/preview';
import { Body } from '@react-email/body';
import * as React from 'react';
import { preset } from 'tailwind-preset';

export default function Email() {
  return (
    <Html>
      <Head />
      <Preview>
        testemail testemail testemailtestemail testemail testemail testemail testemail
        testemail testemail testemail testemail
      </Preview>
      <Tailwind
        config={{
          presets: [preset as any],
        }}
      >
        <Body className="bg-white">
          <Button
            pX={20}
            pY={12}
            href="https://example.com"
            className="text-text-text-and-icon"
          >
            Click me
          </Button>
        </Body>
      </Tailwind>
    </Html>
  );
}
