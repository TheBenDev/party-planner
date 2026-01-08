// components/email-template.tsx

import { Body, Container, Heading, Html } from "@react-email/components";
import type * as React from "react";

interface EmailTemplateProps {
	firstName: string;
}

export const EmailTemplate: React.FC<Readonly<EmailTemplateProps>> = ({
	firstName,
}) => (
	<Html>
		<Body>
			<Container>
				<Heading>Welcome, {firstName}!</Heading>
			</Container>
		</Body>
	</Html>
);

export default EmailTemplate;
