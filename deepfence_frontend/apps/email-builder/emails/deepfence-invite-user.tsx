import {
  Body,
  //   Button,
  Column,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from '@react-email/components';

import * as React from 'react';

import { preset } from 'tailwind-preset';

const baseUrl = 'http://localhost:3000';

export const InviteUser = () => {
  return (
    <Html>
      <Head />
      <Tailwind
        config={{
          theme: preset.theme,
        }}
      >
        <Body className="bg-card">
          <Container className="border border-solid border-bg-grid-border rounded my-[40px] mx-auto p-[20px]">
            <Section className="mt-[32px]">
              <Img
                src={`${baseUrl}/static/deepfence-logo.svg`}
                alt="Deepfence logo"
                className="my-0 mx-auto"
              />
            </Section>
            <Heading className="text-h3 text-text-and-icon font-normal text-center p-0 my-[30px] mx-0">
              Join <strong>Threatmapper</strong>
            </Heading>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};

export default InviteUser;
