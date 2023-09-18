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
              <h2 className="title">About</h2>
              <br />
              <span className="description">
                <h6>All your needs in one place</h6>
                <br />
                <p>
                  Looking for a one-stop-shop for all your research software
                  needs? Look no further than Reh@Store! Developed by{" "}
                  <a href="https://pt.linkedin.com/in/zlynt">Ivan Teixeira</a>,
                  this cutting-edge software distribution service is the
                  brainchild of the{" "}
                  <a href="https://neurorehablab.arditi.pt/">NeuroRehabLab</a>.
                  With Reh@Store, you'll never have to waste precious time
                  searching for the right software again - it's all right at
                  your fingertips. Get ready to take your research projects to
                  the next level with Reh@Store!
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
            <Col lg="6" md="12">
              <div className="icons-container">
                <i
                  className="fa fa-brain"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-user-doctor"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-stethoscope"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-person-walking"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-heart-pulse"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i>
                  <img
                    src={"rehastore_logo.svg"}
                    style={{  height: "5rem", marginBottom: "30px", marginLeft: "-20px" }}
                  />
                </i>
                <i
                  className="fa fa-dumbbell"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-laptop-medical"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-weight-scale"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-users"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-magnifying-glass"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-vial"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-gamepad"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-earth-americas"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
                <i
                  className="fa fa-code"
                  style={{
                    animation: `float ${customNumberGenerate()}s ease-in-out infinite`,
                  }}
                />
              </div>
            </Col>
          </Row>
        </Container>
      </div>{" "}
    </>
  );
}

export default SectionNucleoIcons;
