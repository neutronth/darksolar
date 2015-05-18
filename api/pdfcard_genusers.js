var PDFCard = require ('./pdfcard');
var inherits = require ('util').inherits;
var crypto = require ('crypto');
var Entities = require ('html-entities').AllHtmlEntities;

var PDFCardGenUsers = function (config) {
  PDFCardGenUsers.super_.apply (this, config);
  PDFCardGenUsers.super_.prototype.initialize.apply (this);
  this.config = config;

  return this;
};

inherits (PDFCardGenUsers, PDFCard);

PDFCardGenUsers.prototype.model = function (model) {
  this.model = model;
  this.enabled = true;

  return this;
};

PDFCardGenUsers.prototype.draw = function (cardNo, data) {
  var p = {};
  p = this.cardNotoXY (cardNo);

  this.drawBorder (p.x, p.y);
  this.drawLogo (p.x, p.y);
  this.drawTextGenID (p.x, p.y, data.meta._id, data.meta.prefix);
  this.drawTextUserPassword (p.x, p.y, data.username, data.password);

  if (data.meta.info.trim () !== '')
    this.drawTextInfo (p.x, p.y, data.meta.info);

  this.drawBackground (p.x, p.y);
};

PDFCardGenUsers.prototype.drawTextGenID = function (x, y, id, prefix) {
  var xOffset = x + 100;
  var yOffset = y + 5;
  var width  = this.cardWidth - 110;
  var height = 15;

  this.pdfdoc.font ('Monospace')
    .fontSize (7)
    .fill ('black')
    .text ('GENID: ' + id.toString ().substring (0, 8), xOffset, yOffset,
           {
             align: 'left',
             width: width,
             height: height,
           })
    .text ('Prefix: ' + prefix, xOffset, yOffset,
           {
             align: 'right',
             width: width,
             height: height,
           });
};

PDFCardGenUsers.prototype.drawTextUserPassword = function (x, y, user,
                                                           cryptedpass) {
  var xOffset = x + 110;
  var yOffset = y + 20;
  var xTextOffset = xOffset + 2;
  var yTextOffset = yOffset + 2;
  var width   = this.cardWidth - 110 - 10;
  var height  = 24;
  var textSize = { width: width - 8, height: height - 4 };

  this.pdfdoc.font ('Code')
    .fontSize (7)
    .fill ('#ff6600')
    .text ("U s e r n a m e", xTextOffset + 1, yTextOffset - 1,
           {
             width: textSize.width,
             height: textSize.height,
             align: 'left',
           });

  this.pdfdoc.rect (xOffset, yOffset, width, height)
    .lineWidth (1.5)
    .stroke ('#ff6600');

  this.pdfdoc.font ('Code')
    .fontSize (14)
    .fill ('black')
    .text (user, xTextOffset, yTextOffset,
           {
             width: textSize.width,
             height: textSize.height,
             align: 'right',
           });

  yOffset = yOffset + height + 3;
  yTextOffset = yOffset + 2;

  this.pdfdoc.font ('Code')
    .fontSize (7)
    .fill ('#ff6600')
    .text ("P a s s w o r d", xTextOffset + 1, yTextOffset - 1,
           {
             width: textSize.width,
             height: textSize.height,
             align: 'left',
           });

  this.pdfdoc.rect (xOffset, yOffset, width, height)
    .lineWidth (1.5)
    .stroke ('#ff6600');

  this.pdfdoc.font ('Code')
    .fontSize (14)
    .fill ('black')
    .text (this.decipherPassword (cryptedpass), xTextOffset, yTextOffset,
           {
             width: textSize.width,
             height: textSize.height,
             align: 'right',
           });
};

PDFCardGenUsers.prototype.decipherPassword = function (cryptedpass) {
  var decipher = crypto.createDecipher ('aes-256-cbc', this.config.accesscodeKey);
  var dec = decipher.update (cryptedpass, 'hex', 'utf8');
  dec += decipher.final ('utf8');

  return dec;
};

PDFCardGenUsers.prototype.drawTableHeader = function (x, y, rowHeight) {
  this.pdfdoc.lineWidth (0.25);

  var xOffset = x;
  var yOffset = y;
  var tableWidth = this.safeHeight;
  var colWidth = tableWidth;

  this.pdfdoc.font ('GarudaBold')
    .fontSize (12)
    .text ('GENID ' + this.model[0].meta.id.toString ().substring (0, 8) +
           ', Prefix ' + this.model[0].meta.prefix +
           ' [' + this.model[0].meta.purpose + ']',
           xOffset, yOffset + 2,
           { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, tableWidth, rowHeight)
    .stroke ();

  this.pdfdoc.font ('Garuda')
    .fontSize (9);

  yOffset += rowHeight;

  /* Username */
  colWidth = 0.08 * tableWidth;
  this.pdfdoc.text ('Username', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Name */
  xOffset += colWidth;
  colWidth = 0.25 * tableWidth;
  this.pdfdoc.text ('Name', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Personal ID/Passport No */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc.text ('Personal ID/Passport No', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Date and Time */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc.text ('Date and Time', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();


  /* Signature */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc.text ('Signature', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Released By */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc.text ('Released By', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Remark */
  xOffset += colWidth;
  colWidth = 0.13 * tableWidth;
  this.pdfdoc.text ('Remark', xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();
};

PDFCardGenUsers.prototype.drawTableRow = function (data, x, y, rowHeight) {
  this.pdfdoc.lineWidth (0.25);

  var xOffset = x;
  var yOffset = y;
  var tableWidth = this.safeHeight;
  var colWidth = tableWidth;

  this.pdfdoc.font ('Garuda')
    .fontSize (9);

  /* Username */
  colWidth = 0.08 * tableWidth;
  this.pdfdoc.text (data.username, xOffset, yOffset + 5,
                    { width: colWidth, height: rowHeight, align: 'center' })
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Name */
  xOffset += colWidth;
  colWidth = 0.25 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Personal ID/Passport No */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Date and Time */
  xOffset += colWidth;
  colWidth = 0.15 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();


  /* Signature */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Released By */
  xOffset += colWidth;
  colWidth = 0.12 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();

  /* Remark */
  xOffset += colWidth;
  colWidth = 0.13 * tableWidth;
  this.pdfdoc
    .rect (xOffset, yOffset, colWidth, rowHeight)
    .stroke ();
};

PDFCardGenUsers.prototype.drawTextInfo = function (x, y, info) {
  var xOffset = x + 100;
  var yOffset = y + 15;
  var width   = this.cardWidth - 100;
  var height  = 30;
  var entities = new Entities ();
  var infoText = info ? entities.decode (info) : '';

  var xDesc = x + 5;
  var yDesc = y + 75;

  this.pdfdoc.font ('Garuda')
    .fontSize (8)
    .text (infoText,
           xDesc, yDesc, {
             width: this.cardWidth - 10,
             height: 50,
           });
};


module.exports = PDFCardGenUsers;
