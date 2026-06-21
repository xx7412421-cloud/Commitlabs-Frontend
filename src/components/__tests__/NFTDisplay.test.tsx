/**
 * @vitest-environment happy-dom
 */

import React from "react";
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import NFTDisplay from "@/components/NFTDisplay";

describe("NFTDisplay", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders artwork, parsed metadata, commitment parameters, and attestation link", () => {
    render(
      <NFTDisplay
        tokenId="CMT-591-ALPHA"
        metadata={{
          name: "Alpha Liquidity Commitment",
          description: "A commitment NFT backed by XLM liquidity.",
          image: "https://example.test/nft.png",
          owner: "GABCDEFGHIJKLMNOPQRSTUVWXYZ23456789",
          contractAddress: "CCONTRACTADDRESS1234567890",
          mintDate: "2026-06-18",
          riskProfile: "Balanced",
          amount: "50000",
          asset: "XLM",
          maturityDate: "2026-12-31",
          complianceScore: 94,
        }}
        attestationHref="#history"
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Alpha Liquidity Commitment" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("img", { name: "Alpha Liquidity Commitment artwork" }),
    ).toHaveAttribute("src", "https://example.test/nft.png");
    expect(
      screen.getByText("A commitment NFT backed by XLM liquidity."),
    ).toBeInTheDocument();
    expect(screen.getByText("GABCDEFG...456789")).toBeInTheDocument();
    expect(screen.getByText("CCONTRAC...567890")).toBeInTheDocument();
    expect(screen.getByText("2026-06-18")).toBeInTheDocument();
    expect(screen.getByText("Balanced")).toBeInTheDocument();
    expect(screen.getByText("50000 XLM")).toBeInTheDocument();
    expect(screen.getByText("94%")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /view attestation history/i }),
    ).toHaveAttribute("href", "#history");
  });

  it("keeps the component prop-driven and allows explicit props to override metadata values", () => {
    render(
      <NFTDisplay
        tokenId="TOKEN-1"
        metadata={{
          owner: "GMETADATAOWNER0000000000000000000000000000001",
          complianceScore: 40,
        }}
        ownerAddress="GPROPADDRESS000000000000000000000000000000001"
        complianceScore={88}
      />,
    );

    expect(screen.getByText("GPROPADD...000001")).toBeInTheDocument();
    expect(screen.queryByText("GMETADA...000001")).not.toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  it("shows a branded fallback when metadata has no image", () => {
    render(
      <NFTDisplay
        tokenId="CMT-591-ALPHA"
        metadata={{ name: "Fallback NFT" }}
      />,
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("PHA")).toBeInTheDocument();
    expect(screen.getByText("#CMT-591-ALPHA")).toBeInTheDocument();
    expect(
      screen.queryByText(/NFT Display component/i),
    ).not.toBeInTheDocument();
  });

  it("switches to the visual fallback when the artwork fails to load", () => {
    render(
      <NFTDisplay
        tokenId="CMT-BROKEN-IMAGE"
        metadata={{
          name: "Broken Image NFT",
          imageUrl: "https://example.test/broken.png",
        }}
      />,
    );

    fireEvent.error(
      screen.getByRole("img", { name: "Broken Image NFT artwork" }),
    );

    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.getByText("#CMT-BROKEN-IMAGE")).toBeInTheDocument();
  });

  it("handles missing metadata without rendering raw JSON", () => {
    const { container } = render(<NFTDisplay tokenId="SHORT" />);

    expect(
      screen.getByRole("heading", { name: "Commitment NFT #SHORT" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Not scored")).toBeInTheDocument();
    expect(screen.getByText("Not set")).toBeInTheDocument();
    expect(container.querySelector("pre")).toBeNull();
    expect(screen.queryByText(/"tokenId"/i)).not.toBeInTheDocument();
  });
});
