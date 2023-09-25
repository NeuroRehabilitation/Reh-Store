/*!

=========================================================
* Paper Kit React - v1.3.1
=========================================================

* Product Page: https://www.creative-tim.com/product/paper-kit-react

* Copyright 2022 Creative Tim (https://www.creative-tim.com)
* Licensed under MIT (https://github.com/creativetimofficial/paper-kit-react/blob/main/LICENSE.md)

* Coded by Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/
import React from "react";

// reactstrap components
import { Button, Container, Row, Col, UncontrolledTooltip } from "reactstrap";

// core components

function SectionDownload() {
  return (
    <>
      <div className="section">
        <Container className="text-center">
          <Row></Row>
          <Row className="justify-content-md-center sharing-area text-center">
            <Col className="text-center" lg="8" md="12">
              <h2 className="title">Contact</h2>
              <p className="description">
                Have a question or need help? Contact us using the prefered
                method.
              </p>
              <p className="description">
                Email: <a href="#">tickets@rehstore-remote-support.p.tawk.email</a>
              </p>
            </Col>
            <Col className="text-center" lg="8" md="12">
              <Button
                className="linkedin-sharrre btn-round  ml-2"
                color="google-bg"
                href="mailto:tickets@rehstore-remote-support.p.tawk.email"
                target="_blank"
                id="tooltip840791273"
              >
                <i className="fa fa-envelope" /> Email
              </Button>
              <UncontrolledTooltip delay={0} target="tooltip840791273">
                Send an email
              </UncontrolledTooltip>
            </Col>
          </Row>
        </Container>
      </div>
    </>
  );
}

export default SectionDownload;
