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
import { Button, Container, Row, Col } from "reactstrap";

// core components

function SectionNucleoIcons() {
  const customNumberGenerate = () => {
    return `${Math.floor(Math.random() * 3) + 5}.${Math.floor(
      Math.random() * (999 - 100 + 1) + 100
    )}`;
  };
  return (
    <>
      <div
        className="section section-dark section-nucleo-icons"
        style={{ background: "none" }}
      >
        <Container>
          <Row>
            <Col lg="6" md="12">
              <h2 className="title">Prefer to self host?</h2>
              <br />
              <span className="description">
              <p>
                <b>We are Open-Source!</b> It is possible to self host the Reh@Store server.
                <br/>
                Link to Reh@Store repository:
                <br/>
                <a href="https://github.com/NeuroRehabilitation/Reh-Store">https://github.com/NeuroRehabilitation/Reh-Store </a>
                </p>
              </span>
              <br />
              {/** <Button
                className="btn-round"
                color="danger"
                href="/nucleo-icons"
                target="_blank"
              >
                View Demo Icons
              </Button>
              <Button
                className="btn-round ml-1"
                color="danger"
                href="https://nucleoapp.com/?ref=1712"
                outline
                target="_blank"
              >
                View All Icons
  </Button> **/}
            </Col>
          </Row>
        </Container>
      </div>{" "}
    </>
  );
}

export default SectionNucleoIcons;
